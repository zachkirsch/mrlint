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
import { EnvironmentConfig } from "@fern-api/mrlint-commons/src/types";
import { FileSystem } from "@fern-api/mrlint-virtual-file-system";
import produce, { Draft } from "immer";
import { IPackageJson } from "package-json-type";
import path from "path";
import { canPackageContainCss } from "../utils/canPackageContainCss";
import { OUTPUT_DIR } from "../utils/constants";
import { Executable, Executables } from "../utils/Executables";
import { getDependencies } from "../utils/getDependencies";
import { writePackageFile } from "../utils/writePackageFile";
import { CLI_FILENAME, ESBUILD_BUILD_SCRIPT_FILE_NAME, ESBUILD_OUTPUT_DIR } from "./cli";
import { ENV_RC_FILENAME } from "./env-cmd";

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
            const pathToCli = path.join(ESBUILD_OUTPUT_DIR, CLI_FILENAME);
            draft.bin = {
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
        test: `yarn compile && ${executables.get(Executable.JEST)} --passWithNoTests`,
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
            "lint:style:fix": "yarn lint:style --fix",
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

    if (
        packageToLint.config.type === PackageType.REACT_APP ||
        packageToLint.config.type === PackageType.TYPESCRIPT_CLI
    ) {
        draft.scripts = {
            ...draft.scripts,
            ...packageToLint.config.environment.environments.reduce(
                (envScripts, environment) => ({
                    ...envScripts,
                    [`env:${environment}`]: `${executables.get(
                        Executable.ENV_CMD
                    )} -r ${ENV_RC_FILENAME} -e ${environment}`,
                }),
                {}
            ),
        };
    }

    if (packageToLint.config.type === PackageType.REACT_APP) {
        draft.scripts = {
            ...draft.scripts,
            ...generateScriptsForEnvironments({
                environmentConfig: packageToLint.config.environment,
                scriptName: "start",
                script: executables.get(Executable.VITE),
            }),
            ...generateScriptsForEnvironments({
                environmentConfig: packageToLint.config.environment,
                scriptName: "build",
                script: `${executables.get(Executable.VITE)} build`,
                prefix: "yarn compile &&",
            }),
            ...generateScriptsForEnvironments({
                environmentConfig: packageToLint.config.environment,
                scriptName: "preview",
                script: `${executables.get(Executable.VITE)} preview`,
                prefix: "yarn compile &&",
            }),
        };
    }

    if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
        draft.scripts = {
            ...draft.scripts,
            ...generateScriptsForEnvironments({
                environmentConfig: packageToLint.config.environment,
                scriptName: "dist",
                script: `node ${ESBUILD_BUILD_SCRIPT_FILE_NAME}`,
                prefix: "yarn compile &&",
            }),
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

function generateScriptsForEnvironments({
    environmentConfig,
    scriptName,
    script,
    prefix,
}: {
    environmentConfig: EnvironmentConfig;
    scriptName: string;
    script: string;
    prefix?: string;
}): Record<string, string> {
    function generateScript(environment: string | undefined) {
        const parts: string[] = [];
        if (prefix != null) {
            parts.push(prefix);
        }
        if (environment != null) {
            parts.push(`yarn env:${environment}`);
        }
        parts.push(script);

        return parts.join(" ");
    }

    const firstEnvironment = environmentConfig.environments[0];

    if (firstEnvironment == null) {
        return {
            [scriptName]: generateScript(undefined),
        };
    }

    if (environmentConfig.environments.length === 1) {
        return {
            [scriptName]: generateScript(firstEnvironment),
        };
    }

    return environmentConfig.environments.reduce(
        (acc, environment) => ({
            ...acc,
            [`${scriptName}:${environment}`]: generateScript(environment),
        }),
        {}
    );
}
