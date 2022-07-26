import {
    getPackageJson,
    getRuleConfig,
    LintablePackage,
    Logger,
    PackageType,
    Result,
    Rule,
    RuleType,
} from "@fern-api/mrlint-commons";
import { FileSystem } from "@fern-api/mrlint-virtual-file-system";
import produce, { Draft } from "immer";
import { IPackageJson } from "package-json-type";
import path from "path";
import { canPackageContainCss } from "../utils/canPackageContainCss";
import { OUTPUT_DIR } from "../utils/constants";
import { Executable, Executables } from "../utils/Executables";
import { getDependencies } from "../utils/getDependencies";
import { writePackageFile } from "../utils/writePackageFile";
import { ENV_FILE_NAME, ESBUILD_BUILD_SCRIPT_FILE_NAME, ESBUILD_BUNDLE_FILENAME, ESBUILD_OUTPUT_DIR } from "./cli";

const EXPECTED_DEV_DEPENDENCIES = ["@types/node"];

interface RuleConfig {
    scripts?: Record<string, string>;
}

export const PackageJsonRule: Rule.PackageRule = {
    ruleId: "package-json",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

async function runRule({
    fileSystems,
    relativePathToRoot,
    relativePathToSharedConfigs,
    packageToLint,
    logger,
    addDevDependency,
    ruleConfig,
    repository,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const executables = new Executables();

    let packageJson: IPackageJson;
    try {
        packageJson = await generatePackageJson({
            packageToLint,
            relativePathToRoot,
            relativePathToSharedConfigs,
            logger,
            executables,
            ruleConfig: getRuleConfig(ruleConfig),
            repository,
            fileSystemForPackage: fileSystems.getFileSystemForPackage(packageToLint),
        });
    } catch (error) {
        logger.error({
            message: "Failed to generate package.json",
            error,
        });
        return Result.failure();
    }

    // warn about invalid workspace versions
    packageJson = produce(packageJson, (draft) => {
        draft.dependencies = updateWorkspaceVersions(packageJson.dependencies);
        draft.devDependencies = updateWorkspaceVersions(packageJson.devDependencies);
    });

    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
            filename: "package.json",
            contents: JSON.stringify(packageJson),
            logger,
        })
    );

    // warn about missing deps
    for (const requiredDependency of executables.getRequiredDependencies()) {
        addDevDependency(requiredDependency.dependency, requiredDependency.version);
    }
    for (const dependency of EXPECTED_DEV_DEPENDENCIES) {
        addDevDependency(dependency);
    }

    return result;
}

async function generatePackageJson({
    packageToLint,
    relativePathToRoot,
    relativePathToSharedConfigs,
    logger,
    executables,
    ruleConfig,
    repository,
    fileSystemForPackage,
}: {
    packageToLint: LintablePackage;
    relativePathToRoot: string;
    relativePathToSharedConfigs: string;
    logger: Logger;
    executables: Executables;
    ruleConfig: RuleConfig | undefined;
    repository: string;
    fileSystemForPackage: FileSystem;
}): Promise<IPackageJson> {
    const oldPackageJson = await getPackageJson(fileSystemForPackage, logger);
    if (oldPackageJson == null) {
        throw new Error("Missing package.json");
    }

    const pathToEslintIgnore = path.join(relativePathToRoot, ".eslintignore");
    const pathToPrettierIgnore = path.join(relativePathToSharedConfigs, ".prettierignore");

    const packageJson = produce<IPackageJson>({}, (draft) => {
        draft.name = oldPackageJson.name;
        draft.version = "0.0.0";
        draft.repository = {
            type: "git",
            url: repository,
            directory: packageToLint.relativePath,
        };
        if (packageToLint.config.private) {
            draft.private = true;
        }

        draft.files = [OUTPUT_DIR];
        if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
            draft.files.push(ESBUILD_OUTPUT_DIR);
        }

        draft.type = "module";
        draft.source = "src/index.ts";
        draft.module = "src/index.ts";
        draft.main = "lib/index.js";
        draft.types = "lib/index.d.ts";

        draft.sideEffects = false;

        if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
            const pathToCli = path.join(ESBUILD_OUTPUT_DIR, ESBUILD_BUNDLE_FILENAME);
            draft.bin =
                packageToLint.config.cliName == null
                    ? pathToCli
                    : {
                          [packageToLint.config.cliName]: pathToCli,
                      };
        }

        addScripts({
            draft,
            executables,
            pathToEslintIgnore,
            pathToPrettierIgnore,
            packageToLint,
            customScripts: ruleConfig?.scripts ?? {},
        });

        if (packageToLint.config.type === PackageType.REACT_APP) {
            draft.browserslist = {
                production: [">0.2%", "not dead", "not op_mini all"],
                development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"],
            };
        }

        if (oldPackageJson.dependencies != null) {
            draft.dependencies = sortDependencies(oldPackageJson.dependencies);
        }
        if (oldPackageJson.devDependencies != null) {
            draft.devDependencies = sortDependencies(oldPackageJson.devDependencies);
        }

        if (
            canPackageContainCss(packageToLint) &&
            getDependencies(draft).some((d) => d.name.startsWith("@blueprintjs/"))
        ) {
            draft.postcss = {
                "postcss-modules": {
                    globalModulePaths: ["@blueprintjs.*"],
                },
            };
        }
    });

    return packageJson;
}

function addScripts({
    draft,
    executables,
    pathToEslintIgnore,
    pathToPrettierIgnore,
    packageToLint,
    customScripts,
}: {
    draft: Draft<IPackageJson>;
    executables: Executables;
    pathToEslintIgnore: string;
    pathToPrettierIgnore: string;
    packageToLint: LintablePackage;
    customScripts: Record<string, string>;
}) {
    draft.scripts = {
        clean: `rm -rf ./${OUTPUT_DIR} && ${executables.get(Executable.TSC)} --build --clean`,
        compile: `${executables.get(Executable.TSC)} --build`,
        test: `yarn run compile && ${executables.get(Executable.JEST)} --passWithNoTests`,
        "lint:eslint": `${executables.get(Executable.ESLINT)} --max-warnings 0 . --ignore-path=${pathToEslintIgnore}`,
        "lint:eslint:fix": `${executables.get(
            Executable.ESLINT
        )} --max-warnings 0 . --ignore-path=${pathToEslintIgnore} --fix`,
    };

    if (canPackageContainCss(packageToLint)) {
        draft.scripts = {
            ...draft.scripts,
            "lint:style": `${executables.get(
                Executable.STYLELINT
            )} 'src/**/*.scss' --allow-empty-input --max-warnings 0`,
            "lint:style:fix": "yarn run lint:style --fix",
        };
    }

    draft.scripts = {
        ...draft.scripts,
        format: `${executables.get(
            Executable.PRETTIER
        )} --write --ignore-unknown --ignore-path ${pathToPrettierIgnore} "**"`,
        "format:check": `${executables.get(
            Executable.PRETTIER
        )} --check --ignore-unknown --ignore-path ${pathToPrettierIgnore} "**"`,
        depcheck: executables.get(Executable.DEPCHECK),
    };

    if (packageToLint.config.type === PackageType.REACT_APP) {
        draft.scripts = {
            ...draft.scripts,
            start: `${executables.get(Executable.ENV_CMD)} -e development ${executables.get(
                Executable.ENV_CMD
            )} -f .env.local --silent craco start`,
            build: "yarn run compile && craco build",
        };

        draft.scripts.eject = `${executables.get(Executable.REACT_SCRIPTS)} eject`;
    }

    if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
        draft.scripts = {
            ...draft.scripts,
            dist: [
                "yarn run compile",
                `${executables.get(Executable.ENV_CMD)} -f ${ENV_FILE_NAME} node ${ESBUILD_BUILD_SCRIPT_FILE_NAME}`,
            ].join(" && "),
        };
    }

    draft.scripts = {
        ...draft.scripts,
        ...customScripts,
    };
}

function sortDependencies(dependencies: Record<string, string>): Record<string, string> {
    return Object.keys(dependencies)
        .sort()
        .reduce(
            (all, key) => ({
                ...all,
                [key]: dependencies?.[key],
            }),
            {}
        );
}

function updateWorkspaceVersions(dependencies: Record<string, string> | undefined): Record<string, string> | undefined {
    if (dependencies == null) {
        return undefined;
    }

    return produce(dependencies, (draft) => {
        for (const [dep, version] of Object.entries(dependencies)) {
            if (version.startsWith("workspace")) {
                draft[dep] = "workspace:*";
            }
        }
    });
}
