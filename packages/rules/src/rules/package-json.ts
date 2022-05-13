import { getRuleConfig, LintablePackage, Logger, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import produce, { Draft } from "immer";
import { IPackageJson } from "package-json-type";
import path from "path";
import { Executable, Executables } from "../utils/Executables";
import { getDependencies } from "../utils/getDependencies";
import {
    CJS_OUTPUT_DIR,
    ESM_OUTPUT_DIR,
    getTsconfigFilenameForType,
    MODULE_TYPES,
    OUTPUT_DIR,
} from "../utils/moduleUtils";
import { tryGetPackageJson } from "../utils/tryGetPackageJson";
import { writePackageFile } from "../utils/writePackageFile";

const PRODUCTION_ENVIRONMENT_ENV_VAR = "REACT_APP_PRODUCTION_ENVIRONMENT";
const EXPECTED_DEV_DEPENDENCIES = ["@types/node"];
const PATH_TO_CLI_SCRIPT = "./cli";
const ENTRYPOINT = "index.js";

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
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const executables = new Executables();

    let packageJson: IPackageJson;
    try {
        packageJson = generatePackageJson({
            packageToLint,
            relativePathToRoot,
            relativePathToSharedConfigs,
            logger,
            executables,
            ruleConfig: getRuleConfig(ruleConfig),
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
        addDevDependency(requiredDependency.dependency);
    }
    for (const dependency of EXPECTED_DEV_DEPENDENCIES) {
        addDevDependency(dependency);
    }

    return result;
}

function generatePackageJson({
    packageToLint,
    relativePathToRoot,
    relativePathToSharedConfigs,
    logger,
    executables,
    ruleConfig,
}: {
    packageToLint: LintablePackage;
    relativePathToRoot: string;
    relativePathToSharedConfigs: string;
    logger: Logger;
    executables: Executables;
    ruleConfig: RuleConfig | undefined;
}): IPackageJson {
    const oldPackageJson = tryGetPackageJson(packageToLint, logger);
    if (oldPackageJson == null) {
        throw new Error("Missing package.json");
    }

    const pathToEslintIgnore = path.join(relativePathToRoot, ".eslintignore");
    const pathToPrettierIgnore = path.join(relativePathToSharedConfigs, ".prettierignore");

    const packageJson = produce<IPackageJson>({}, (draft) => {
        draft.name = oldPackageJson.name;
        draft.version = "0.0.0";
        if (packageToLint.config.private) {
            draft.private = true;
        }
        draft.files = [OUTPUT_DIR];
        draft.main = `./${path.join(CJS_OUTPUT_DIR, ENTRYPOINT)}`;
        draft.types = `./${path.join(ESM_OUTPUT_DIR, "index.d.ts")}`;
        draft.exports = {
            ".": {
                require: `./${path.join(CJS_OUTPUT_DIR, ENTRYPOINT)}`,
                default: `./${path.join(ESM_OUTPUT_DIR, ENTRYPOINT)}`,
            },
        };
        draft.sideEffects = false;

        if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
            draft.bin =
                packageToLint.config.cliName == null
                    ? PATH_TO_CLI_SCRIPT
                    : {
                          [packageToLint.config.cliName]: PATH_TO_CLI_SCRIPT,
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
            getDependencies(packageJson.dependencies).some((d) => d.startsWith("@blueprintjs/"))
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
        clean: MODULE_TYPES.map(
            (moduleType) => `${executables.get(Executable.TSC)} --build clean ${getTsconfigFilenameForType(moduleType)}`
        ).join(" && "),
        compile: MODULE_TYPES.map(
            (moduleType) => `${executables.get(Executable.TSC)} --build ${getTsconfigFilenameForType(moduleType)}`
        ).join(" && "),
        test: `${executables.get(Executable.JEST)} --passWithNoTests`,
        "lint:eslint": `${executables.get(Executable.ESLINT)} --max-warnings 0 . --ignore-path=${pathToEslintIgnore}`,
        "lint:eslint:fix": `${executables.get(
            Executable.ESLINT
        )} --max-warnings 0 . --ignore-path=${pathToEslintIgnore} --fix`,
        "lint:style": `${executables.get(Executable.STYLELINT)} '**/*.scss' --allow-empty-input --max-warnings 0`,
        "lint:style:fix": `${executables.get(
            Executable.STYLELINT
        )} '**/*.scss' --allow-empty-input --max-warnings 0 --fix`,
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
            "build:staging": `${PRODUCTION_ENVIRONMENT_ENV_VAR}=STAGING ${executables.get(
                Executable.ENV_CMD
            )} -e development craco --max_old_space_size=4096 build`,
            "build:production": `${PRODUCTION_ENVIRONMENT_ENV_VAR}=PRODUCTION ${executables.get(
                Executable.ENV_CMD
            )} -e production craco --max_old_space_size=4096 build`,
            "deploy:staging": `${PRODUCTION_ENVIRONMENT_ENV_VAR}=STAGING ${executables.get(
                Executable.AWS_CDK
            )} deploy --output deploy/cdk.out --require-approval never --progress events`,
            "deploy:production": `${PRODUCTION_ENVIRONMENT_ENV_VAR}=PRODUCTION ${executables.get(
                Executable.AWS_CDK
            )} deploy --output deploy/cdk.out --require-approval never --progress events`,
            eject: `${executables.get(Executable.REACT_SCRIPTS)} eject`,
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

function canPackageContainCss(p: LintablePackage): boolean {
    if (p.config.type == null) {
        return false;
    }
    switch (p.config.type) {
        case PackageType.REACT_APP:
        case PackageType.REACT_LIBRARY:
            return true;
        case PackageType.TYPESCRIPT_CLI:
        case PackageType.TYPESCRIPT_LIBRARY:
        case PackageType.CUSTOM:
            return false;
    }
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
