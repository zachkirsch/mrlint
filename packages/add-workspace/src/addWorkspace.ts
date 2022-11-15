import { Monorepo, MonorepoLoggers, PackageType, Result } from "@mrlint/commons";
import { lintMonorepo } from "@mrlint/lint";
import { convertPackageConfig, MRLINT_PACKAGE_CONFIG_FILENAME, PackageConfigSchema } from "@mrlint/parser";
import execa from "execa";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { promptForPackageMetadata } from "./promptForPackageMetadata";

export async function addWorkspace({
    monorepo,
    loggers,
}: {
    monorepo: Monorepo;
    loggers: MonorepoLoggers;
}): Promise<Result> {
    const { location, packageName, directoryName, type, isPrivate } = await promptForPackageMetadata(monorepo);
    const absolutePackagePath = path.join(location, directoryName);

    try {
        const result = await tryAddWorkspace({
            monorepo,
            loggers,
            absolutePackagePath,
            packageName,
            packageType: type,
            isPackagePrivate: isPrivate,
        });
        if (result.isSuccess()) {
            return result;
        }
    } catch (error) {
        loggers.getLogger().error({
            message: "Failed to create package",
            error,
        });
    }
    await rm(absolutePackagePath, { recursive: true });
    return Result.failure();
}

async function tryAddWorkspace({
    monorepo,
    loggers,
    absolutePackagePath,
    packageName,
    packageType,
    isPackagePrivate,
}: {
    monorepo: Monorepo;
    loggers: MonorepoLoggers;
    absolutePackagePath: string;
    packageName: string;
    packageType: PackageType;
    isPackagePrivate: boolean;
}) {
    await writeSkeletonPackageToDiskAndYarnInstall({ absolutePackagePath, packageName, monorepo });
    const rawMrlintConfig: PackageConfigSchema = await writeMrlintConfigToDisk({
        packageType,
        isPackagePrivate,
        absolutePackagePath,
    });
    await writeSrc(absolutePackagePath);
    const result = await lintPackage({
        monorepo,
        packageName,
        absolutePackagePath,
        rawMrlintConfig,
        loggers,
    });
    return result;
}

async function writeSkeletonPackageToDiskAndYarnInstall({
    packageName,
    absolutePackagePath,
    monorepo,
}: {
    packageName: string;
    absolutePackagePath: string;
    monorepo: Monorepo;
}) {
    await mkdir(absolutePackagePath);
    await writeFile(
        path.join(absolutePackagePath, "package.json"),
        JSON.stringify({ name: packageName }, undefined, 2)
    );
    await execa("yarn", {
        cwd: monorepo.root.fullPath,
    });
}

async function writeMrlintConfigToDisk({
    packageType,
    isPackagePrivate,
    absolutePackagePath,
}: {
    packageType: PackageType;
    isPackagePrivate: boolean;
    absolutePackagePath: string;
}) {
    const rawMrlintConfig = getRawConfig({ packageType, isPackagePrivate });
    await writeFile(
        path.join(absolutePackagePath, MRLINT_PACKAGE_CONFIG_FILENAME),
        JSON.stringify(rawMrlintConfig, undefined, 2)
    );
    return rawMrlintConfig;
}

function getRawConfig({
    packageType,
    isPackagePrivate,
}: {
    packageType: PackageType;
    isPackagePrivate: boolean;
}): PackageConfigSchema {
    switch (packageType) {
        case PackageType.REACT_APP:
            return { type: "react-app", private: isPackagePrivate };
        case PackageType.REACT_LIBRARY:
            return { type: "react-library", private: isPackagePrivate };
        case PackageType.TYPESCRIPT_LIBRARY:
            return { type: "library", private: isPackagePrivate };
        case PackageType.TYPESCRIPT_CLI:
            return { type: "cli", cliName: "", private: isPackagePrivate };
        case PackageType.CUSTOM:
            return { type: "custom", private: isPackagePrivate };
    }
}

async function writeSrc(absolutePackagePath: string) {
    const srcPath = path.join(absolutePackagePath, "src");
    await mkdir(srcPath);
    await writeFile(path.join(srcPath, "index.ts"), "export {};");
}

async function lintPackage({
    monorepo,
    absolutePackagePath,
    packageName,
    rawMrlintConfig,
    loggers,
}: {
    monorepo: Monorepo;
    absolutePackagePath: string;
    packageName: string;
    rawMrlintConfig: PackageConfigSchema;
    loggers: MonorepoLoggers;
}) {
    return await lintMonorepo({
        monorepo: {
            ...monorepo,
            packages: [
                ...monorepo.packages,
                {
                    name: packageName,
                    relativePath: path.relative(monorepo.root.fullPath, absolutePackagePath),
                    config: convertPackageConfig(rawMrlintConfig),
                },
            ],
        },
        loggers,
        shouldFix: true,
        packageNamesToLint: [packageName],
    });
}
