import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { writePackageFile } from "../utils/writePackageFile";

export const CliRule: Rule.PackageRule = {
    ruleId: "cli",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: runRule,
};

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    if (packageToLint.config.type !== PackageType.TYPESCRIPT_CLI) {
        logger.error("This package is not a CLI. This is a bug in mrlint.");
        return Result.failure();
    }
    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "cli",
        contents: `#!/usr/bin/env node

require("${packageToLint.config.pathToCli}");`,
        logger,
    });
}
