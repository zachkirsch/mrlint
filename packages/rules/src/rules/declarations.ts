import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { writePackageFile } from "../utils/writePackageFile";

export const DeclarationsRule: Rule.PackageRule = {
    ruleId: "declarations",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_APP],
    run: runRule,
};

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "src/declarations.d.ts",
        contents: `declare module "*.module.scss";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";`,
        logger,
    });
}
