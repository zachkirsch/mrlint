import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { writePackageFile } from "../utils/writePackageFile";

export const DeclarationsRule: Rule.PackageRule = {
    ruleId: "declarations",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_APP, PackageType.REACT_LIBRARY],
    run: runRule,
};

async function runRule({
    fileSystems,
    packageToLint,
    logger,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    addDevDependency("vite");

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "src/declarations.d.ts",
        contents: '/// <reference types="vite/client" />',
        logger,
    });
}
