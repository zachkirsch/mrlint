import { getRuleConfig, PackageType, Result, Rule, RuleType } from "@mrlint/commons";
import { writePackageFile } from "../utils/writePackageFile";

export const ViteRule: Rule.PackageRule = {
    ruleId: "vite",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.VITE_APP],
    run: runRule,
};

interface RuleConfig {
    sourceMapsInProduction?: boolean;
}

async function runRule({
    fileSystems,
    packageToLint,
    logger,
    addDevDependency,
    ruleConfig,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const castedRuleConfig = getRuleConfig<RuleConfig>(ruleConfig);

    const fileSystem = fileSystems.getFileSystemForPackage(packageToLint);

    addDevDependency("sass");

    result.accumulate(
        await writePackageFile({
            fileSystem,
            filename: "src/vite-env.d.ts",
            contents: '/// <reference types="vite/client" />',
            logger,
        })
    );

    if (!(await fileSystem.doesFileExist("index.html"))) {
        result.accumulate(
            await writePackageFile({
                fileSystem,
                filename: "index.html",
                contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
                logger,
            })
        );
    }

    addDevDependency("vite-plugin-checker");
    addDevDependency("@vitejs/plugin-react");
    result.accumulate(
        await writePackageFile({
            fileSystem,
            filename: "vite.config.ts",
            logger,
            contents: generateViteConfig({
                sourceMapsInProduction: castedRuleConfig?.sourceMapsInProduction,
            }),
        })
    );

    return result;
}

function generateViteConfig({
    sourceMapsInProduction = false,
}: {
    sourceMapsInProduction: boolean | undefined;
}): string {
    let contents = `import react from "@vitejs/plugin-react";
    import { defineConfig } from "vite";
    import checker from "vite-plugin-checker";
    
    // https://vitejs.dev/config/
    export default defineConfig({
        plugins: [
            react(),
            checker({
                typescript: {
                    buildMode: true,
                },
            }),
        ],
        server: {
            open: true,
        },
        resolve: {
            alias: [
                {
                    // this is required for the SCSS modules
                    find: /^~(.*)$/,
                    replacement: "$1",
                },
            ],
        },
        css: {
            modules: {
                generateScopedName: "[name]__[local]___[hash:base64:5]",
            },
        },`;

    if (sourceMapsInProduction) {
        contents += `
        build: {
            sourcemap: true,
        },`;
    }

    contents += `
    });`;

    return contents;
}
