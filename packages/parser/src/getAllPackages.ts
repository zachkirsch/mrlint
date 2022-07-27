import {
    BasePackageConfig,
    CliPackageInfo,
    MonorepoRoot,
    Package,
    PackageConfig,
    PackageType,
} from "@fern-api/mrlint-commons";
import execa from "execa";
import { readFile } from "fs/promises";
import { IPackageJson } from "package-json-type";
import path from "path";
import { z } from "zod";
import { readConfig } from "./readConfig";
import { PackageConfigSchema } from "./schemas/PackageConfigSchema";

type RawPackageConfig = z.infer<typeof PackageConfigSchema>;

export const MRLINT_PACKAGE_CONFIG_FILENAME = ".mrlint.json";

export async function getAllPackages(monorepoRoot: MonorepoRoot): Promise<Package[]> {
    const packages: Package[] = [];

    const rootPackageJson = await getRootPackageJson(monorepoRoot);

    if (rootPackageJson == null) {
        throw new Error("No package.json found in monorepo root");
    }
    if (rootPackageJson.workspaces == null || rootPackageJson.workspaces.length === 0) {
        throw new Error("No 'workspaces' found in root package.json");
    }

    const { stdout } = await execa("yarn", ["workspaces", "list", "--json"]);
    const packageLocations = stdout
        .split("\n")
        .map((line) => path.join(monorepoRoot.fullPath, JSON.parse(line).location))
        .filter((packageLocation) => path.normalize(packageLocation) !== path.normalize(monorepoRoot.fullPath));
    for (const packageDirectory of packageLocations) {
        const rawConfig = await readConfig(path.join(packageDirectory, MRLINT_PACKAGE_CONFIG_FILENAME), (contents) =>
            PackageConfigSchema.parse(contents)
        );
        packages.push({
            relativePath: path.relative(monorepoRoot.fullPath, packageDirectory),
            config: rawConfig != null ? convertPackageConfig(rawConfig) : undefined,
        });
    }

    return packages;
}

async function getRootPackageJson(monorepo: MonorepoRoot): Promise<IPackageJson | undefined> {
    try {
        const packageJson = (await readFile(path.join(monorepo.fullPath, "package.json"))).toString();
        return JSON.parse(packageJson);
    } catch (e) {
        return undefined;
    }
}

export function convertPackageConfig(rawConfig: RawPackageConfig): PackageConfig {
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
                environment: {
                    variables: rawConfig.environment?.variables ?? [],
                    environments:
                        rawConfig.environment?.environments != null
                            ? Object.entries(rawConfig.environment.environments).reduce<Record<string, CliPackageInfo>>(
                                  (acc, [environmentName, packageInfo]) => ({
                                      ...acc,
                                      [environmentName]: {
                                          cliPackageName: packageInfo.cliPackageName,
                                          cliName: packageInfo.cliName,
                                      },
                                  }),
                                  {}
                              )
                            : {},
                },
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
                environment: {
                    environments: rawConfig.environment?.environments ?? [],
                    variables: rawConfig.environment?.variables ?? [],
                },
            };
        case "custom":
            return {
                ...baseConfig,
                type: PackageType.CUSTOM,
            };
    }
}
