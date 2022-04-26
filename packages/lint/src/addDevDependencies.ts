import { Logger, MonorepoLoggers, Package, Result } from "@fern-api/mrlint-commons";
import chalk from "chalk";
import { exec } from "child_process";

export type PackageName = string;
export type DependencyName = string;

export interface PackageWithRequiredDevDependencies {
    package: Package;
    devDependenciesToAdd: Set<DependencyName>;
}

export async function addDevDependencies({
    devDependencies,
    shouldFix,
    loggers,
}: {
    devDependencies: Record<PackageName, PackageWithRequiredDevDependencies>;
    shouldFix: boolean;
    loggers: MonorepoLoggers;
}): Promise<Result> {
    const result = Result.success();

    for (const [packageName, { package: p, devDependenciesToAdd }] of Object.entries(devDependencies)) {
        result.accumulate(
            await addDevDependenciesForPackage({
                packageName,
                devDependenciesToAdd: [...devDependenciesToAdd],
                existingDevDependencies: Object.keys({
                    ...p.packageJson?.dependencies,
                    ...p.packageJson?.devDependencies,
                }),
                shouldFix,
                logger: loggers.getLoggerForPackage(p),
            })
        );
    }

    return result;
}

export async function addDevDependenciesForPackage({
    packageName,
    existingDevDependencies,
    devDependenciesToAdd,
    shouldFix,
    logger,
}: {
    packageName: string;
    existingDevDependencies: readonly DependencyName[];
    devDependenciesToAdd: readonly DependencyName[];
    shouldFix: boolean;
    logger: Logger;
}): Promise<Result> {
    const existingDevDependenciesSet = new Set(existingDevDependencies);
    const filteredDependencies: DependencyName[] = [];
    for (const devDependencyToAdd of devDependenciesToAdd) {
        if (!existingDevDependenciesSet.has(devDependencyToAdd)) {
            filteredDependencies.push(devDependencyToAdd);
        }
    }

    if (filteredDependencies.length === 0) {
        return Result.success();
    }

    if (!shouldFix) {
        logger.error({
            message: "Some devDependencies are missing",
            additionalContent: filteredDependencies,
        });
        return Result.failure();
    }

    logger.debug({
        message: "Adding devDependencies",
        additionalContent: filteredDependencies,
    });

    return new Promise((resolve) => {
        exec(`yarn workspace ${packageName} add --prefer-dev ${filteredDependencies.join(" ")}`, (error, stdout) => {
            if (error == null) {
                logger.info({
                    message: chalk.green("Installed missing devDependencies"),
                    additionalContent: filteredDependencies,
                });
                resolve(Result.success());
            } else {
                logger.error({
                    message: "Failed to install devDependencies",
                    additionalContent: filteredDependencies,
                    error: stdout.length > 0 ? stdout : undefined,
                });
                resolve(Result.failure());
            }
        });
    });
}
