import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
import { writePackageFile } from "../utils/writePackageFile";

export const PrettierRule: Rule.PackageRule = {
    ruleId: "prettier",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

async function runRule({
    fileSystems,
    packageToLint,
    relativePathToRoot,
    logger,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const contents = `module.exports = require("${path.join(relativePathToRoot, ".prettierrc.json")}");`;

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ".prettierrc.js",
        contents,
        logger,
    });
}
