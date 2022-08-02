const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { build } = require("esbuild");
const path = require("path");
const { chmod, writeFile } = require("fs/promises");

main();

async function main() {
    const options = {
        platform: "node",
        target: "node14",
        entryPoints: ["./src/cli.ts"],
        outfile: "./dist/bundle.cjs",
        bundle: true,
        external: ["cpu-features"],
        plugins: [pnpPlugin()],
        inject: ["./import-meta-url.js"],
        define: {
            "import.meta.url": "import_meta_url",
            "process.env.CLI_NAME": JSON.stringify("mrlint"),
        },
    };

    await writeFile("import-meta-url.js", "export var import_meta_url = require('url').pathToFileURL(__filename);");

    await build(options).catch(() => process.exit(1));

    process.chdir(path.join(__dirname, "dist"));

    // write cli executable
    await writeFile(
        "cli.cjs",
        `#!/usr/bin/env node

require("./bundle.cjs");`
    );
    await chmod("cli.cjs", "755");

    // write cli's package.json
    const packageJson = require("./package.json");
    await writeFile(
        "package.json",
        JSON.stringify(
            {
                name: "mrlint",
                version: packageJson.version,
                repository: packageJson.repository,
                files: ["bundle.cjs", "cli.cjs"],
                bin: { mrlint: "cli.cjs" },
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
    });
}
