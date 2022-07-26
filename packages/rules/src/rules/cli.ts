import { PackageType, Rule, RuleType } from "@fern-api/mrlint-commons";
import { TypescriptCliPackageConfig } from "@fern-api/mrlint-commons/src/types";
import { snakeCase } from "lodash";
import path from "path";
import { writePackageFile } from "../utils/writePackageFile";

export const ESBUILD_OUTPUT_DIR = "dist";
export const ESBUILD_BUILD_SCRIPT_FILE_NAME = "build.cjs";
export const CLI_FILENAME = "cli.cjs";
const ESBUILD_BUNDLE_FILENAME = "bundle.cjs";

export const CliRule: Rule.PackageRule<typeof PackageType.TYPESCRIPT_CLI> = {
    ruleId: "cli",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: ({ fileSystems, packageToLint, logger, addDevDependency }) => {
        addDevDependency("esbuild");
        addDevDependency("@yarnpkg/esbuild-plugin-pnp");

        return writePackageFile({
            fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
            filename: ESBUILD_BUILD_SCRIPT_FILE_NAME,
            contents: generateScriptContents(packageToLint.config),
            logger,
        });
    },
};

function generateScriptContents(config: TypescriptCliPackageConfig) {
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
        outfile: "./${path.join(ESBUILD_OUTPUT_DIR, ESBUILD_BUNDLE_FILENAME)}",
        bundle: true,
        external: ["cpu-features"],
        plugins: [pnpPlugin()],`;

    if (config.environment.variables.length > 0) {
        script += `    define: {
            ${config.environment.variables
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

    if (config.cliPackageName != null) {
        script += `
        
    // write cli's package.json
    const packageJson = require("./package.json");
    await writeFile(
        "package.json",
        JSON.stringify(
            {
                name: process.env.${snakeCase(config.cliPackageName).toUpperCase()}_CLI_PACKAGE_NAME ?? "${
            config.cliPackageName
        }",
                version: packageJson.version,
                repository: packageJson.repository,
                files: ["${ESBUILD_BUNDLE_FILENAME}", "${CLI_FILENAME}"],
                bin: ${`{ ${config.cliName}: "${CLI_FILENAME}" }`},
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
