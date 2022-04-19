import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import produce from "immer";
import { writePackageFile } from "../utils/writePackageFile";

interface DepcheckConfig {
    ignores?: string[];
    "ignore-patterns"?: string[];
}

export const DepcheckRule: Rule.PackageRule = {
    ruleId: "depcheck",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    let depcheckRc: DepcheckConfig = {
        "ignore-patterns": ["lib"],
    };

    if (packageToLint.config.type === PackageType.REACT_APP) {
        depcheckRc = produce(depcheckRc, (draft) => {
            if (draft.ignores == null) {
                draft.ignores = [];
            }
            draft.ignores.push("sass");
        });
    }

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ".depcheckrc.json",
        contents: JSON.stringify(depcheckRc),
        logger,
    });
}
