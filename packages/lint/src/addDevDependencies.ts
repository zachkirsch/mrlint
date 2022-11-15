import { getPackageJson, Logger, Monorepo, MonorepoLoggers, Package, Result } from "@mrlint/commons";
import { FileSystem } from "@mrlint/virtual-file-system";
import chalk from "chalk";
import { exec } from "child_process";
import semverCompare from "semver-compare";

export type PackageName = string;
export type DependencyName = string;
export type DependencyVersion = string;

export interface DependencyVersions {
    requestedVersions: Set<DependencyVersion>;
}

export interface PackageWithRequiredDevDependencies {
    package: Package;
    devDependenciesToAdd: Record<DependencyName, DependencyVersions>;
}

export async function addDevDependencies({
    monorepo,
    devDependencies,
    shouldFix,
    loggers,
    getFileSystemForPackage,
}: {
    monorepo: Monorepo;
    devDependencies: Record<PackageName, PackageWithRequiredDevDependencies>;
    shouldFix: boolean;
    loggers: MonorepoLoggers;
    getFileSystemForPackage: (p: Package) => FileSystem;
}): Promise<Result> {
    const result = Result.success();

    const existingVersionsAcrossMonorepo: Record<DependencyName, DependencyVersion> = {};
    for (const p of monorepo.packages) {
        const loggerForPackage = loggers.getLoggerForPackage(p);
        const packageJson = await getPackageJson(getFileSystemForPackage(p), loggerForPackage);
        const allDependencies = {
            ...packageJson?.dependencies,
            ...packageJson?.devDependencies,
        };
        for (const [dependency, version] of Object.entries(allDependencies)) {
            const existingVersion = existingVersionsAcrossMonorepo[dependency];
            if (existingVersion == null || semverCompare(version, existingVersion) === 1) {
                existingVersionsAcrossMonorepo[dependency] = version;
            }
        }
    }

    for (const [packageName, { package: p, devDependenciesToAdd }] of Object.entries(devDependencies)) {
        const loggerForPackage = loggers.getLoggerForPackage(p);
        const packageJson = await getPackageJson(getFileSystemForPackage(p), loggerForPackage);
        result.accumulate(
            await addDevDependenciesForPackage({
                packageName,
                devDependenciesToAdd,
                existingDevDependencies: {
                    ...packageJson?.dependencies,
                    ...packageJson?.devDependencies,
                },
                existingVersionsAcrossMonorepo,
                shouldFix,
                logger: loggerForPackage,
            })
        );
    }

    return result;
}

export async function addDevDependenciesForPackage({
    packageName,
    existingDevDependencies,
    existingVersionsAcrossMonorepo,
    devDependenciesToAdd,
    shouldFix,
    logger,
}: {
    packageName: string;
    existingDevDependencies: Record<DependencyName, DependencyVersion>;
    existingVersionsAcrossMonorepo: Record<DependencyName, DependencyVersion>;
    devDependenciesToAdd: Record<DependencyName, DependencyVersions>;
    shouldFix: boolean;
    logger: Logger;
}): Promise<Result> {
    const filteredDependencies: Record<DependencyName, DependencyVersion | undefined> = {};
    let someDependencyHasMultipleVersionsRequested = false;

    for (const [dependencyName, versionInfo] of Object.entries(devDependenciesToAdd)) {
        const [firstRequestedVersion, ...otherRequestedVersions] = [...versionInfo.requestedVersions];

        if (otherRequestedVersions.length > 0) {
            logger.error(
                `Multiple versions requested for ${dependencyName}: ${[...versionInfo.requestedVersions].join(", ")}`
            );
            someDependencyHasMultipleVersionsRequested = true;
            continue;
        }

        const existingVersionForDependency = existingDevDependencies[dependencyName];
        if (
            existingVersionForDependency == null ||
            (firstRequestedVersion != null && firstRequestedVersion !== existingVersionForDependency)
        ) {
            filteredDependencies[dependencyName] = firstRequestedVersion;
        }
    }

    if (someDependencyHasMultipleVersionsRequested) {
        return Result.failure();
    }

    if (Object.keys(filteredDependencies).length === 0) {
        return Result.success();
    }

    const dependenciesWithVersions = Object.entries(filteredDependencies).map(([dependencyName, dependencyVersion]) => {
        // if version isn't specified, default to the existing version used in the monorepo
        const version = dependencyVersion ?? existingVersionsAcrossMonorepo[dependencyName];
        return version == null ? dependencyName : `${dependencyName}@${version}`;
    });

    if (!shouldFix) {
        logger.error({
            message: "Some devDependencies are missing",
            additionalContent: dependenciesWithVersions,
        });
        return Result.failure();
    }

    logger.debug({
        message: "Adding devDependencies",
        additionalContent: dependenciesWithVersions,
    });

    return new Promise((resolve) => {
        exec(
            `yarn workspace ${packageName} add --prefer-dev ${dependenciesWithVersions.join(" ")}`,
            (error, stdout) => {
                if (error == null) {
                    logger.info({
                        message: chalk.green("Installed missing devDependencies"),
                        additionalContent: dependenciesWithVersions,
                    });
                    resolve(Result.success());
                } else {
                    logger.error({
                        message: "Failed to install devDependencies",
                        additionalContent: dependenciesWithVersions,
                        error: stdout.length > 0 ? stdout : undefined,
                    });
                    resolve(Result.failure());
                }
            }
        );
    });
}
