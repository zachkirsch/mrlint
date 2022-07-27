import {
    getPackageJson,
    getRuleConfig,
    LintablePackage,
    Logger,
    PackageType,
    Result,
    Rule,
    RuleType,
} from "@mrlint/commons";
import { FileSystem } from "@mrlint/virtual-file-system";
import produce, { Draft } from "immer";
import { IPackageJson } from "package-json-type";
import path from "path";
import { canPackageContainCss } from "../utils/canPackageContainCss";
import { OUTPUT_DIR } from "../utils/constants";
import { Executable, Executables } from "../utils/Executables";
import { getEnvironments } from "../utils/getEnvironments";
import { writePackageFile } from "../utils/writePackageFile";
import {
    CLI_OUTPUT_DIRS_PARENT,
    ESBUILD_BUNDLE_FILENAME,
    ESBUILD_SCRIPT_FILENAME_FOR_NO_ENVIRONMENTS,
    getCliOutputDirForEnvironment,
    getEsbuildScriptFilenameForEnvironment,
} from "./cli";
import { ENV_RC_FILENAME } from "./env-cmd";

const EXPECTED_DEV_DEPENDENCIES = ["@types/node"];
const DIST_CLI_SCRIPT_NAME = "dist:cli";
const PUBLISH_CLI_SCRIPT_NAME = "publish:cli";

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
        draft.type = "module";
        draft.source = "src/index.ts";
        draft.module = "src/index.ts";
        draft.main = "lib/index.js";
        draft.types = "lib/index.d.ts";

        draft.sideEffects = false;

        if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
            const environments = getEnvironments(packageToLint.config);
            draft.bin = generateRecordForEnvironments({
                environments,
                keyPrefix: packageToLint.config.cliName,
                getValueForEnvironment: (environmentName) =>
                    `./${path.join(
                        getCliOutputDirForEnvironment({ environment: environmentName, allEnvironments: environments }),
                        ESBUILD_BUNDLE_FILENAME
                    )}`,
                fallback: {
                    [packageToLint.config.cliName]: `./${path.join(CLI_OUTPUT_DIRS_PARENT, ESBUILD_BUNDLE_FILENAME)}`,
                },
            });
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
        const environments = getEnvironments(packageToLint.config);
        draft.scripts = {
            ...draft.scripts,
            ...environments.reduce(
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
                environments: packageToLint.config.environment.environments,
                variables: packageToLint.config.environment.variables,
                scriptName: "start",
                script: executables.get(Executable.VITE),
            }),
            ...generateScriptsForEnvironments({
                environments: packageToLint.config.environment.environments,
                variables: packageToLint.config.environment.variables,
                scriptName: "build",
                script: `${executables.get(Executable.VITE)} build`,
                prefix: "yarn compile &&",
            }),
            ...generateScriptsForEnvironments({
                environments: packageToLint.config.environment.environments,
                variables: packageToLint.config.environment.variables,
                scriptName: "preview",
                script: `${executables.get(Executable.VITE)} preview`,
                prefix: "yarn compile &&",
            }),
        };
    }

    if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
        const environments = getEnvironments(packageToLint.config);
        draft.scripts = {
            ...draft.scripts,
            ...generateDynamicScriptsForEnvironments({
                environments,
                variables: packageToLint.config.environment.variables,
                scriptName: DIST_CLI_SCRIPT_NAME,
                script: (environmentName) =>
                    `node ${getEsbuildScriptFilenameForEnvironment({
                        environment: environmentName,
                        allEnvironments: environments,
                    })}`,
                prefix: "yarn compile &&",
                fallback: `yarn compile && node ${ESBUILD_SCRIPT_FILENAME_FOR_NO_ENVIRONMENTS}`,
            }),
            ...generateRecordForEnvironments({
                environments,
                keyPrefix: PUBLISH_CLI_SCRIPT_NAME,
                getValueForEnvironment: (environment) =>
                    [
                        `yarn ${getScriptNameForEnvironment({
                            scriptName: DIST_CLI_SCRIPT_NAME,
                            environment,
                            allEnvironments: environments,
                        })}`,
                        `cd ${getCliOutputDirForEnvironment({
                            environment,
                            allEnvironments: environments,
                        })}`,
                        "yarn npm publish",
                    ].join(" && "),
                fallback: {
                    [PUBLISH_CLI_SCRIPT_NAME]: `yarn ${DIST_CLI_SCRIPT_NAME} && cd ${CLI_OUTPUT_DIRS_PARENT} && yarn npm publish`,
                },
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
    environments,
    variables,
    scriptName,
    script,
    prefix,
}: {
    environments: string[];
    variables: string[];
    scriptName: string;
    script: string;
    prefix?: string;
}): Record<string, string> {
    return generateDynamicScriptsForEnvironments({
        environments,
        variables,
        scriptName,
        script,
        prefix,
        fallback: prefix != null ? `${prefix} ${script}` : script,
    });
}

function generateDynamicScriptsForEnvironments({
    environments,
    variables,
    scriptName,
    script,
    prefix,
    fallback,
}: {
    environments: string[];
    variables: string[];
    scriptName: string;
    script: string | ((environment: string) => string);
    prefix?: string | ((environment: string) => string);
    fallback?: string;
}): Record<string, string> {
    return generateRecordForEnvironments({
        environments,
        keyPrefix: scriptName,
        getValueForEnvironment: (environment: string) => {
            const parts: string[] = [];
            if (prefix != null) {
                parts.push(typeof prefix === "string" ? prefix : prefix(environment));
            }
            if (environment != null && variables.length > 0) {
                parts.push(`yarn env:${environment}`);
            }
            parts.push(typeof script === "string" ? script : script(environment));

            return parts.join(" ");
        },
        fallback: fallback != null ? { [scriptName]: fallback } : undefined,
    });
}

function getScriptNameForEnvironment({
    scriptName,
    environment,
    allEnvironments,
}: {
    scriptName: string;
    environment: string;
    allEnvironments: string[];
}): string {
    return getRecordKeyNameForEnvironment({
        keyPrefix: scriptName,
        environment,
        allEnvironments,
    });
}

function generateRecordForEnvironments({
    environments,
    keyPrefix,
    getValueForEnvironment,
    fallback = {},
}: {
    environments: string[];
    keyPrefix: string;
    getValueForEnvironment: (environment: string) => string;
    fallback?: Record<string, string>;
}): Record<string, string> {
    const firstEnvironment = environments[0];
    if (firstEnvironment == null) {
        return fallback;
    }

    return environments.reduce(
        (acc, environment) => ({
            ...acc,
            [getRecordKeyNameForEnvironment({ keyPrefix, environment, allEnvironments: environments })]:
                getValueForEnvironment(environment),
        }),
        {}
    );
}

function getRecordKeyNameForEnvironment({
    keyPrefix,
    environment,
    allEnvironments,
}: {
    keyPrefix: string;
    environment: string;
    allEnvironments: string[];
}): string {
    if (allEnvironments.length <= 1) {
        return keyPrefix;
    } else {
        return `${keyPrefix}:${environment}`;
    }
}
