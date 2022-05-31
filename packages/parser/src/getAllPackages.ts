import { BasePackageConfig, MonorepoRoot, Package, PackageConfig, PackageType } from "@fern-api/mrlint-commons";
import execa from "execa";
import { readFile } from "fs/promises";
import { IPackageJson } from "package-json-type";
import path from "path";
import { z } from "zod";
import { readConfig } from "./readConfig";
import { PackageConfigSchema } from "./schemas/PackageConfigSchema";

type RawPackageConfig = z.infer<typeof PackageConfigSchema>;

export async function getAllPackages(monorepoRoot: MonorepoRoot): Promise<Package[]> {
    const packages: Package[] = [];

    const rootPackageJson = await getPackageJson(monorepoRoot.fullPath);
    if (rootPackageJson == null) {
        throw new Error("No package.json found in monorepo root");
    }
    if (rootPackageJson.workspaces == null || rootPackageJson.workspaces.length === 0) {
        throw new Error("No 'workspaces' found in root package.json");
    }

    const { stdout } = await execa("yarn", ["workspaces", "list", "--json"]);
    const packageLocations = stdout.split("\n").map((p) => JSON.parse(p).location);
    for (const packageDirectory of packageLocations) {
        const rawConfig = await readConfig(path.join(packageDirectory, ".mrlint.json"), (contents) =>
            PackageConfigSchema.parse(contents)
        );
        packages.push({
            relativePath: path.relative(monorepoRoot.fullPath, packageDirectory),
            config: rawConfig != null ? convertConfig(rawConfig) : undefined,
            packageJson: await getPackageJson(packageDirectory),
        });
    }

    return packages;
}

async function getPackageJson(packageDirectory: string): Promise<IPackageJson | undefined> {
    try {
        const packageJson = (await readFile(path.join(packageDirectory, "package.json"))).toString();
        return JSON.parse(packageJson);
    } catch (e) {
        return undefined;
    }
}

function convertConfig(rawConfig: RawPackageConfig): PackageConfig {
    const baseConfig: BasePackageConfig = {
        private: rawConfig.private,
        rules: rawConfig.rules ?? {},
    };
    switch (rawConfig.type) {
        case "cli":
            return {
                ...baseConfig,
                type: PackageType.TYPESCRIPT_CLI,
                cliName: rawConfig.cliName,
                pathToCli: rawConfig.pathToCli,
            };
        case "library":
            return {
                ...baseConfig,
                type: PackageType.TYPESCRIPT_LIBRARY,
            };
        case "react-library":
            return {
                ...baseConfig,
                type: PackageType.REACT_LIBRARY,
            };
        case "react-app":
            return {
                ...baseConfig,
                type: PackageType.REACT_APP,
            };
        case "custom":
            return {
                ...baseConfig,
                type: PackageType.CUSTOM,
            };
    }
}
