import { PackageType, Result, Rule, RuleType } from "@mrlint/commons";
import path from "path";
import { writePackageFile } from "../utils/writePackageFile";

export const StyleLintRule: Rule.PackageRule = {
    ruleId: "stylelint",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.VITE_APP, PackageType.NEXT_APP, PackageType.REACT_LIBRARY],
    run: runRule,
};

async function runRule({
    fileSystems,
    packageToLint,
    relativePathToSharedConfigs,
    logger,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const contents = {
        extends: [path.join(relativePathToSharedConfigs, "stylelintrc.shared.json")],
    };

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ".stylelintrc.json",
        contents: JSON.stringify(contents),
        logger,
    });
}
