import { getRuleConfig, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { canPackageContainCss } from "../utils/canPackageContainCss";
import { OUTPUT_DIR } from "../utils/moduleUtils";
import { writePackageFile } from "../utils/writePackageFile";

interface DepcheckConfig {
    ignores: string[];
    "ignore-patterns": string[];
}

interface RuleConfig {
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

async function runRule({
    fileSystems,
    packageToLint,
    logger,
    ruleConfig,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const depcheckRc: DepcheckConfig = {
        ignores: ["@types/jest", "@types/node"],
        "ignore-patterns": [OUTPUT_DIR],
    };

    if (packageToLint.config.type === PackageType.REACT_APP) {
        addDevDependency("@craco/craco");
        depcheckRc.ignores.push("react-scripts", "node-polyfill-webpack-plugin");
    }

    if (canPackageContainCss(packageToLint)) {
        depcheckRc.ignores.push("sass");
    }

    const castedRuleConfig = getRuleConfig<RuleConfig>(ruleConfig);
    if (castedRuleConfig != null) {
        if (castedRuleConfig["ignore-patterns"] != null) {
            depcheckRc["ignore-patterns"].push(...castedRuleConfig["ignore-patterns"]);
        }
        if (castedRuleConfig["ignores"] != null) {
            depcheckRc["ignores"].push(...castedRuleConfig["ignores"]);
        }
    }

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: ".depcheckrc.json",
        contents: JSON.stringify(depcheckRc),
        logger,
    });
}
