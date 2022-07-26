import { Logger, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { LintablePackage } from "@fern-api/mrlint-commons/src/types";
import path from "path";
import { writePackageFile } from "../utils/writePackageFile";

export const ESBUILD_OUTPUT_DIR = "dist";
export const ESBUILD_BUILD_SCRIPT_FILE_NAME = "build.cjs";
export const CLI_FILENAME = "cli";
const ESBUILD_BUNDLE_FILENAME = "bundle.cjs";

export const ENV_FILE_NAME = ".env.cjs";

export const CliRule: Rule.PackageRule = {
    ruleId: "cli",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: runRule,
};

async function runRule({
    fileSystems,
    packageToLint,
    logger,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    packageToLint.config;

    const result = Result.success();
    result.accumulate(await writeEsbuildScript({ fileSystems, packageToLint, logger, addDevDependency }));
    result.accumulate(await maybeWriteEnvFile({ fileSystems, packageToLint, logger }));
    return result;
}

async function writeEsbuildScript({
    fileSystems,
    packageToLint,
    logger,
    addDevDependency,
}: {
    fileSystems: Rule.FileSystems;
    packageToLint: LintablePackage;
    logger: Logger;
    addDevDependency: (dependency: string) => void;
}): Promise<Result> {
    if (packageToLint.config.type !== PackageType.TYPESCRIPT_CLI) {
        logger.error("Package is not a CLI.");
        return Result.failure();
    }

    addDevDependency("esbuild");
    addDevDependency("@yarnpkg/esbuild-plugin-pnp");

    let script = `const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { build } = require("esbuild");
const path = require("path");
const { chmod, writeFile } = require("fs/promises");

main();

async function main() {
    const options = {
        platform: "node",
        entryPoints: ["./src/cli.ts"],
        outfile: "./${path.join(ESBUILD_OUTPUT_DIR, ESBUILD_BUNDLE_FILENAME)}",
        bundle: true,
        external: ["cpu-features"],
        plugins: [pnpPlugin()],`;

    if (packageToLint.config.environmentVariables.length > 0) {
        script += `    define: {
            ${packageToLint.config.environmentVariables
                .map((envVar) => `        "process.env.${envVar}": getEnvironmentVariable("${envVar}"),`)
                .join("\n")}
        },
    };
    
    function getEnvironmentVariable(environmentVariable) {
        const value = process.env[environmentVariable];
        if (value != null) {
            return \`"\${value}"\`;
        }
        throw new Error(\`Environment variable \${environmentVariable} is not defined.\`);
    }`;
    } else {
        script += `
    };`;
    }

    script += `    \n\nawait build(options).catch(() => process.exit(1));
 
    process.chdir(path.join(__dirname, "${ESBUILD_OUTPUT_DIR}"));

    // write cli executable
    await writeFile(
        "${CLI_FILENAME}",
        \`#!/usr/bin/env node

require("./${ESBUILD_BUNDLE_FILENAME}");\`
    );
    await chmod("${CLI_FILENAME}", "755");
`;

    if (packageToLint.config.cliPackageName != null) {
        script += `
        
    // write cli's package.json
    const packageJson = require("./package.json");
    await writeFile(
        "package.json",
        JSON.stringify(
            {
                name: "${packageToLint.config.cliPackageName}",
                version: packageJson.version,
                repository: packageJson.repository,
                files: ["${ESBUILD_BUNDLE_FILENAME}", "${CLI_FILENAME}"],
                bin: ${`{ ${packageToLint.config.cliName}: "${CLI_FILENAME}" }`},
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

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ESBUILD_BUILD_SCRIPT_FILE_NAME,
        contents: script,
        logger,
    });
}

async function maybeWriteEnvFile({
    fileSystems,
    packageToLint,
    logger,
}: {
    fileSystems: Rule.FileSystems;
    packageToLint: LintablePackage;
    logger: Logger;
}): Promise<Result> {
    const fileSystem = fileSystems.getFileSystemForPackage(packageToLint);

    // don't overwrite existing .env file
    if ((await fileSystem.readFile(ENV_FILE_NAME)) != null) {
        return Result.success();
    }

    return writePackageFile({
        fileSystem,
        filename: ENV_FILE_NAME,
        contents: "module.exports = {};",
        logger,
    });
}
