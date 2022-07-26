const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { build } = require("esbuild");

const options = {
    platform: "node",
    entryPoints: ["./src/cli.ts"],
    outfile: "./dist/bundle.cjs",
    bundle: true,
    external: ["cpu-features"],
    plugins: [pnpPlugin()],
};

build(options).catch(() => process.exit(1));

// write cli's package.json
const packageJson = require("./package.json");
const { writeFile } = require("fs/promises");
writeFile(
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
