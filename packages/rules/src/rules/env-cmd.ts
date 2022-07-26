import { LintablePackage, Logger, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { GetEnvVars as getEnvVars } from "env-cmd";
import { writePackageFile } from "../utils/writePackageFile";

export const ENV_RC_FILENAME = ".env-cmdrc.cjs";

export const EnvCmdRule: Rule.PackageRule<typeof PackageType.REACT_APP | typeof PackageType.TYPESCRIPT_CLI> = {
    ruleId: "env-cmd",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_APP, PackageType.TYPESCRIPT_CLI],
    run: async ({ fileSystems, logger, packageToLint }) => {
        const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);

        if (await fileSystemForPackage.doesFileExist(ENV_RC_FILENAME)) {
            return validateEnvFile(fileSystemForPackage.getAbsolutePathToFile(ENV_RC_FILENAME), packageToLint, logger);
        }

        const config = packageToLint.config.environment.environments.reduce(
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
    },
};
async function validateEnvFile(
    absolutePathToEnvCmdRc: string,
    packageToLint: LintablePackage<"React app" | "TypeScript CLI">,
    logger: Logger
): Promise<Result> {
    const result = Result.success();

    for (const environment of packageToLint.config.environment.environments) {
        const env = await getEnvVars({
            rc: {
                environments: [environment],
                filePath: absolutePathToEnvCmdRc,
            },
        });
        for (const variable of packageToLint.config.environment.variables) {
            const value = env[variable];
            if (value == null) {
                logger.error(`Environment variable ${variable} is not defined for environment ${environment}.`);
                result.fail();
            } else if (typeof value !== "string") {
                logger.error(`Environment variable ${variable} for environment ${environment} is not a string.`);
                result.fail();
            }
        }
    }

    return result;
}
