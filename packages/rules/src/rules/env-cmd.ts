import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { writePackageFile } from "../utils/writePackageFile";

const FILENAME = ".env-cmdrc";

export const EnvCmdRule: Rule.PackageRule = {
    ruleId: "env-cmd",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_APP],
    run: runRule,
};

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);
    const existingStr = await fileSystemForPackage.readFile(FILENAME);
    const existing = existingStr != null ? JSON.parse(existingStr) : undefined;

    const contents = {
        ...existing,
        development: existing.development ?? {},
        production: existing.production ?? {},
    };

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: FILENAME,
        contents: JSON.stringify(contents),
        logger,
    });
}
