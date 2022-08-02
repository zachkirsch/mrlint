import { PackageType, Result, Rule, RuleType, TypescriptCliPackageConfig } from "@mrlint/commons";
import path from "path";
import { getEnvironments } from "../utils/getEnvironments";
import { writePackageFile } from "../utils/writePackageFile";

export const ESBUILD_BUNDLE_FILENAME = "bundle.cjs";
const CLI_FILENAME = "cli.cjs";

export const ESBUILD_SCRIPT_FILENAME_FOR_NO_ENVIRONMENTS = "build.cjs";

export const CliRule: Rule.PackageRule<typeof PackageType.TYPESCRIPT_CLI> = {
    ruleId: "cli",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: async ({ fileSystems, packageToLint, logger, addDevDependency }) => {
        addDevDependency("esbuild");
        addDevDependency("@yarnpkg/esbuild-plugin-pnp");

        const result = Result.success();

        const allEnvironments = getEnvironments(packageToLint.config);

        if (allEnvironments.length === 0) {
            result.accumulate(
                await writePackageFile({
                    fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
                    filename: ESBUILD_SCRIPT_FILENAME_FOR_NO_ENVIRONMENTS,
                    contents: generateScriptContents({
                        outputDir: CLI_OUTPUT_DIRS_PARENT,
                        config: packageToLint.config,
                        cliName: packageToLint.config.cliName,
                        cliPackageName: undefined,
                    }),
                    logger,
                })
            );
        }

        for (const [environmentName, packageInfo] of Object.entries(packageToLint.config.environment.environments)) {
            result.accumulate(
                await writePackageFile({
                    fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
                    filename: getEsbuildScriptFilenameForEnvironment({
                        environment: environmentName,
                        allEnvironments,
                    }),
                    contents: generateScriptContents({
                        outputDir: getCliOutputDirForEnvironment({
                            environment: environmentName,
                            allEnvironments,
                        }),
                        config: packageToLint.config,
                        cliName: packageInfo.cliName,
                        cliPackageName: packageInfo.cliPackageName,
                    }),
                    logger,
                })
            );
        }

        return result;
    },
};

function generateScriptContents({
    outputDir,
    config,
    cliName,
    cliPackageName,
}: {
    outputDir: string;
    config: TypescriptCliPackageConfig;
    cliName: string;
    cliPackageName: string | undefined;
}) {
    let script = `const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { build } = require("esbuild");
const path = require("path");
const { chmod, writeFile } = require("fs/promises");

main();

async function main() {
    const options = {
        platform: "node",
        target: "node14",
        entryPoints: ["./src/cli.ts"],
        outfile: "./${path.join(outputDir, ESBUILD_BUNDLE_FILENAME)}",
        bundle: true,
        external: ["cpu-features"],
        plugins: [pnpPlugin()],
        inject: ["./import-meta-url.js"],
        define: {
            "import.meta.url": "import_meta_url",
            "process.env.CLI_NAME": JSON.stringify("${cliName}"),
`;

    if (config.environment.variables.length > 0) {
        script += `${config.environment.variables
            .map((envVar) => `        "process.env.${envVar}": getEnvironmentVariable("${envVar}"),`)
            .join("\n")}
        },
    };
    
    function getEnvironmentVariable(environmentVariable) {
        const value = process.env[environmentVariable];
        if (value != null) {
            return JSON.stringify(value);
        }
        throw new Error(\`Environment variable \${environmentVariable} is not defined.\`);
    }`;
    } else {
        script += `}
    };`;
    }

    script += "    \n\nawait writeFile(\"import-meta-url.js\", \"export var import_meta_url = require('url').pathToFileURL(__filename);\");";
    script += `    \n\nawait build(options).catch(() => process.exit(1));
 
    process.chdir(path.join(__dirname, "${outputDir}"));

    // write cli executable
    await writeFile(
        "${CLI_FILENAME}",
        \`#!/usr/bin/env node

require("./${ESBUILD_BUNDLE_FILENAME}");\`
    );
    await chmod("${CLI_FILENAME}", "755");
`;

    if (cliPackageName != null) {
        script += `
        
    // write cli's package.json
    const packageJson = require("./package.json");
    await writeFile(
        "package.json",
        JSON.stringify(
            {
                name: "${cliPackageName}",
                version: packageJson.version,
                repository: packageJson.repository,
                files: ["${ESBUILD_BUNDLE_FILENAME}", "${CLI_FILENAME}"],
                bin: { "${cliName}": "${CLI_FILENAME}" },
            },
            undefined,
            2
        )
    );
    
    // write empty yarn.lock so yarn doesn't try to associate this package with the monorepo
    await writeFile("yarn.lock", "");

    // install package into new yarn.lock
    // YARN_ENABLE_IMMUTABLE_INSTALLS=false so we can modify yarn.lock even when in CI
    const { exec } = require("child_process");
    exec("YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install", undefined, (error) => {
        if (error != null) {
            console.error(error);
            process.exit(1);
        }
    })
    `;
    }

    script += "\n}";
    return script;
}

export const CLI_OUTPUT_DIRS_PARENT = "dist";
export function getCliOutputDirForEnvironment({
    environment,
    allEnvironments,
}: {
    environment: string;
    allEnvironments: string[];
}): string {
    if (allEnvironments.length <= 1) {
        return CLI_OUTPUT_DIRS_PARENT;
    }
    return path.join(CLI_OUTPUT_DIRS_PARENT, environment);
}

export function getEsbuildScriptFilenameForEnvironment({
    environment,
    allEnvironments,
}: {
    environment: string;
    allEnvironments: string[];
}): string {
    if (allEnvironments.length <= 1) {
        return ESBUILD_SCRIPT_FILENAME_FOR_NO_ENVIRONMENTS;
    }
    return `build.${environment}.cjs`;
}
