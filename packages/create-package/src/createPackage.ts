import { Monorepo, MonorepoLoggers, PackageType, Result } from "@fern-api/mrlint-commons";
import { lintMonorepo } from "@fern-api/mrlint-lint";
import { convertPackageConfig, MRLINT_PACKAGE_CONFIG_FILENAME, PackageConfigSchema } from "@fern-api/mrlint-parser";
import execa from "execa";
import { mkdir, rm, writeFile } from "fs/promises";
import { IPackageJson } from "package-json-type";
import path from "path";
import { promptForPackageMetadata } from "./promptForPackageMetadata";

export async function createPackage({
    monorepo,
    loggers,
}: {
    monorepo: Monorepo;
    loggers: MonorepoLoggers;
}): Promise<Result> {
    const { location, name, type, isPrivate } = await promptForPackageMetadata(monorepo);
    const absolutePackagePath = path.join(location, name);

    try {
        const result = await tryCreatePackage({
            monorepo,
            loggers,
            absolutePackagePath,
            packageName: name,
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

async function tryCreatePackage({
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
    const packageJson: IPackageJson = { name: packageName };

    await writeSkeletonPackageToDiskAndYarnInstall({ absolutePackagePath, packageJson, monorepo });
    const rawMrlintConfig: PackageConfigSchema = await writeMrlintConfigToDisk({
        packageType,
        isPackagePrivate,
        absolutePackagePath,
    });
    await writeSrc(absolutePackagePath);
    const result = await lintPackage({ monorepo, absolutePackagePath, rawMrlintConfig, packageJson, loggers });

    return result;
}

async function writeSkeletonPackageToDiskAndYarnInstall({
    absolutePackagePath,
    packageJson,
    monorepo,
}: {
    absolutePackagePath: string;
    packageJson: IPackageJson;
    monorepo: Monorepo;
}) {
    await mkdir(absolutePackagePath);
    await writeFile(path.join(absolutePackagePath, "package.json"), JSON.stringify(packageJson, undefined, 2));
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
    const rawMrlintConfig: PackageConfigSchema = {
        type: getRawPackageType(packageType),
        private: isPackagePrivate,
    };
    await writeFile(
        path.join(absolutePackagePath, MRLINT_PACKAGE_CONFIG_FILENAME),
        JSON.stringify(rawMrlintConfig, undefined, 2)
    );
    return rawMrlintConfig;
}

function getRawPackageType(packageType: PackageType): PackageConfigSchema["type"] {
    switch (packageType) {
        case PackageType.REACT_APP:
            return "react-app";
        case PackageType.REACT_LIBRARY:
            return "react-library";
        case PackageType.TYPESCRIPT_LIBRARY:
            return "library";
        case PackageType.TYPESCRIPT_CLI:
            return "cli";
        case PackageType.CUSTOM:
            return "custom";
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
    rawMrlintConfig,
    packageJson,
    loggers,
}: {
    monorepo: Monorepo;
    absolutePackagePath: string;
    rawMrlintConfig: PackageConfigSchema;
    packageJson: IPackageJson;
    loggers: MonorepoLoggers;
}) {
    return await lintMonorepo({
        monorepo: {
            ...monorepo,
            packages: [
                {
                    relativePath: path.relative(monorepo.root.fullPath, absolutePackagePath),
                    config: convertPackageConfig(rawMrlintConfig),
                    packageJson,
                },
            ],
        },
        loggers,
        shouldFix: true,
    });
}
