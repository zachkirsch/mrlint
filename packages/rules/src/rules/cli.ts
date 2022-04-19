import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { writePackageFile } from "../utils/writePackageFile";

export const CliRule: Rule.PackageRule = {
    ruleId: "cli",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.TYPESCRIPT_CLI],
    run: runRule,
};

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "cli",
        contents: `#!/usr/bin/env node

require("./lib/index");`,
        logger,
    });
}
