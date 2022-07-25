import { Logger, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { LintablePackage, TypescriptCliPackageConfig } from "@fern-api/mrlint-commons/src/types";
import { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import { writePackageFile } from "../utils/writePackageFile";
import { TsConfig } from "./ts-config";

export const CLI_WEBPACK_CONFIG_TS_FILENAME = "tsconfig.webpack.json";
export const WEBPACK_OUTPUT_DIR = "dist";
export const WEBPACK_BUNDLE_FILENAME = "bundle.cjs";

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
    result.accumulate(await writeWebpackConfig({ fileSystems, packageToLint, logger, addDevDependency }));
    result.accumulate(await writeTsConfig({ fileSystems, packageToLint, logger }));
    result.accumulate(await maybeWriteEnvFile({ fileSystems, packageToLint, logger }));
    return result;
}

async function writeWebpackConfig({
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

    addDevDependency("webpack");
    addDevDependency("webpack-cli");
    addDevDependency("ts-loader");
    addDevDependency("node-loader");

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "webpack.config.ts",
        contents: `import path, { dirname } from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
            
const __dirname = dirname(fileURLToPath(import.meta.url));

export default (): webpack.Configuration => {
    return {
        mode: "production",
        target: "node",
        entry: path.join(__dirname, "./src/cli.ts"),
        module: {
            rules: [
                {
                    test: /\\.js$/,
                    resolve: {
                        fullySpecified: false,
                    },
                },
                {
                    test: /\\.ts$/,
                    loader: "ts-loader",
                    options: {
                        projectReferences: true,
                        transpileOnly: true,
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\\.node$/,
                    loader: "node-loader",
                },
            ],
            parser: {
                javascript: {
                  commonjsMagicComments: true,
                },
            },
        },
        resolve: {
            extensions: [
                // js is first so that if we encounter equivalent TS and JS source files side-by-side
                // (e.g. in node_modules), prefer the js
                ".js",
                ".ts",
            ],
        },
        plugins: ${constructPlugins(packageToLint.config)},
        output: {
            path: path.join(__dirname, "${WEBPACK_OUTPUT_DIR}"),
            filename: "${WEBPACK_BUNDLE_FILENAME}",
        },
        optimization: {
            minimize: false,
        },
    };
};`,
        logger,
    });
}

function constructPlugins(config: TypescriptCliPackageConfig): string {
    const plugins = ['new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true })'];
    if (config.environmentVariables.length > 0) {
        plugins.push(
            `new webpack.EnvironmentPlugin(${config.environmentVariables.map((envVar) => `"${envVar}"`).join(", ")})`
        );
    }
    return `[${plugins.join(", ")}]`;
}

async function writeTsConfig({
    fileSystems,
    packageToLint,
    logger,
}: {
    fileSystems: Rule.FileSystems;
    packageToLint: LintablePackage;
    logger: Logger;
}): Promise<Result> {
    const webpackTsConfig: TsConfig = {
        compilerOptions: {
            module: "CommonJS" as unknown as ModuleKind,
            moduleResolution: "node" as unknown as ModuleResolutionKind,
            target: "esnext" as unknown as ScriptTarget,
            esModuleInterop: true,
            downlevelIteration: true,
            noUncheckedIndexedAccess: true,
        },
        include: ["webpack.config.ts"],
    };

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: CLI_WEBPACK_CONFIG_TS_FILENAME,
        contents: JSON.stringify(webpackTsConfig, undefined, 2),
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
