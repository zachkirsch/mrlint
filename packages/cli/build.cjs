const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { build } = require("esbuild");

main();

async function main() {
    const options = {
        platform: "node",
        entryPoints: ["./src/cli.ts"],
        outfile: "./dist/bundle.cjs",
        bundle: true,
        external: ["cpu-features"],
        plugins: [pnpPlugin()],
    };

    await build(options).catch(() => process.exit(1));

    // write cli's package.json
    const packageJson = require("./package.json");
    const { writeFile } = require("fs/promises");
    await writeFile(
        "dist/package.json",
        JSON.stringify(
            {
                name: "mrlint",
                version: packageJson.version,
                repository: packageJson.repository,
                files: ["bundle.cjs"],
                bin: { mrlint: "bundle.cjs" },
            },
            undefined,
            2
        )
    );

    // write empty yarn.lock so yarn doesn't try to associate this package with the monorepo
    await writeFile("dist/yarn.lock", "");

    // install package into new yarn.lock
    const { exec } = require("child_process");
    exec(
        "yarn install",
        {
            env: {
                // so we can modify yarn.lock even when in CI
                YARN_ENABLE_IMMUTABLE_INSTALLS: "false",
            },
        },
        (error) => {
            if (error != null) {
                process.exit(1);
            }
        }
    );
}
