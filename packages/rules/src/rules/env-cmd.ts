import { LintablePackage, Logger, PackageType, Result, Rule, RuleType } from "@mrlint/commons";
import { GetEnvVars as getEnvVars } from "env-cmd";
import { getEnvironments } from "../utils/getEnvironments";
import { writePackageFile } from "../utils/writePackageFile";

export const ENV_RC_FILENAME = ".env-cmdrc.cjs";

export const EnvCmdRule: Rule.PackageRule<typeof PackageType.TYPESCRIPT_CLI> = {
    ruleId: "env-cmd",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: async ({ fileSystems, logger, packageToLint }) => {
        const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);

        if (await fileSystemForPackage.doesFileExist(ENV_RC_FILENAME)) {
            return validateEnvFile(fileSystemForPackage.getAbsolutePathToFile(ENV_RC_FILENAME), packageToLint, logger);
        } else {
            return createEnvFile({ packageToLint, fileSystems, logger });
        }
    },
};

async function validateEnvFile(
    absolutePathToEnvCmdRc: string,
    packageToLint: LintablePackage<typeof PackageType.TYPESCRIPT_CLI>,
    logger: Logger
): Promise<Result> {
    const result = Result.success();

    for (const environment of getEnvironments(packageToLint.config)) {
        let env: Record<string, unknown>;
        try {
            env = await getEnvVars({
                rc: {
                    environments: [environment],
                    filePath: absolutePathToEnvCmdRc,
                },
            });
        } catch (error) {
            logger.error({
                message: `Failed to load environment "${environment}" from ${ENV_RC_FILENAME}`,
                error,
            });
            result.fail();
            continue;
        }

        for (const variable of packageToLint.config.environment.variables) {
            if (!(variable in env)) {
                logger.error(`Environment variable ${variable} is not defined for environment ${environment}.`);
                result.fail();
            } else {
                const value = env[variable];
                if (value != null && typeof value !== "string") {
                    logger.error(`Environment variable ${variable} for environment ${environment} is not a string.`);
                    result.fail();
                }
            }
        }
    }

    return result;
}

function createEnvFile({
    packageToLint,
    fileSystems,
    logger,
}: {
    packageToLint: LintablePackage<typeof PackageType.TYPESCRIPT_CLI>;
    fileSystems: Rule.FileSystems;
    logger: Logger;
}): Promise<Result> {
    const config = getEnvironments(packageToLint.config).reduce(
        (environmentsAcc, environment) => ({
            ...environmentsAcc,
            [environment]: packageToLint.config.environment.variables.reduce(
                (variablesAcc, variable) => ({
                    ...variablesAcc,
                    [variable]: null,
                }),
                {}
            ),
        }),
        {}
    );

    const contents = `module.exports = ${JSON.stringify(config, undefined, 2)}`;

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ENV_RC_FILENAME,
        contents,
        logger,
    });
}
