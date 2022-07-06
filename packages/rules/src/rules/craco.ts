import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
import { getTsconfigFilenameForType } from "../utils/moduleUtils";
import { writePackageFile } from "../utils/writePackageFile";

export const CracoRule: Rule.PackageRule = {
    ruleId: "craco",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_APP],
    run: runRule,
};

async function runRule({
    fileSystems,
    packageToLint,
    logger,
    relativePathToScripts,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    addDevDependency("@craco/craco");
    addDevDependency("fork-ts-checker-webpack-plugin");
    addDevDependency("node-polyfill-webpack-plugin");

    const CONTENTS = `import { CracoConfig, getLoader, loaderByName } from "@craco/craco";
    import { ForkTsCheckerWebpackPluginConfig } from "fork-ts-checker-webpack-plugin/lib/plugin-config";
    import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
    import { getAllPackages } from "${path.join(relativePathToScripts, "getAllPackages")}";
    
    module.exports = async function (): Promise<CracoConfig> {
        const packages = await getAllPackages();
    
        return {
            webpack: {
                plugins: {
                    add: [new NodePolyfillPlugin()],
                },
                configure: (webpackConfig) => {
                    // load/watch src/ files in other packages
                    const { isFound, match } = getLoader(webpackConfig, loaderByName("babel-loader"));
                    if (isFound) {
                        const loader = (match as any).loader;
                        const include = Array.isArray(loader.include) ? loader.include : [loader.include];
                        loader.include = include.concat(packages.map((p) => \`\${p.location}/src\`));
                    } else {
                        throw new Error("Could not find babel-loader");
                    }
    
                    const forkTsCheckerWebpackPlugin = webpackConfig.plugins?.find(
                        (p) => p.constructor.name === "ForkTsCheckerWebpackPlugin"
                    );
                    if (forkTsCheckerWebpackPlugin != null) {
                        const options = (forkTsCheckerWebpackPlugin as any).options as ForkTsCheckerWebpackPluginConfig;
                        // add --build flag to tsc for building project references
                        options.typescript.build = true;
                        // compile ESM, not CJS
                        options.typescript.configFile = "${getTsconfigFilenameForType("esm")}";
                    } else {
                        throw new Error("Could not find ForkTsCheckerWebpackPlugin");
                    }
    
                    return webpackConfig;
                },
            },
        };
    };`;

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "craco.config.ts",
        contents: CONTENTS,
        logger,
    });
}
