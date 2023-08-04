import { BasePackageConfig, CliPackageInfo, MonorepoRoot, Package, PackageConfig, PackageType } from "@mrlint/commons";
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

    const rootPackageJson = await getPackageJson(monorepoRoot.fullPath);

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
            name: (await getPackageJson(packageDirectory))?.name,
            relativePath: path.relative(monorepoRoot.fullPath, packageDirectory),
            config: rawConfig != null ? convertPackageConfig(rawConfig) : undefined,
        });
    }

    return packages;
}

export function convertPackageConfig(rawConfig: RawPackageConfig): PackageConfig {
    const baseConfig: BasePackageConfig = {
        private: rawConfig.private,
        isCommonJs: rawConfig.commonJs ?? false,
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
                additionalFiles: rawConfig.additionalFiles ?? [],
                plugins: rawConfig.plugins ?? {},
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
        case "vite-app":
            return {
                ...baseConfig,
                type: PackageType.VITE_APP,
                environment: {
                    environments: rawConfig.environment?.environments ?? [],
                    variables: rawConfig.environment?.variables ?? [],
                },
            };
        case "next-app":
            return {
                ...baseConfig,
                type: PackageType.NEXT_APP,
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

async function getPackageJson(packageDirectory: string): Promise<IPackageJson | undefined> {
    const packageJsonPath = path.join(packageDirectory, "package.json");
    try {
        const packageJsonBuffer = await readFile(packageJsonPath);
        const packageJsonStr = packageJsonBuffer.toString();
        return JSON.parse(packageJsonStr) as IPackageJson;
    } catch {
        return undefined;
    }
}
