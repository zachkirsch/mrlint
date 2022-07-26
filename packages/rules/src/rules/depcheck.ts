import { getRuleConfig, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { OUTPUT_DIR } from "../utils/constants";
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
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const depcheckRc: DepcheckConfig = {
        ignores: ["@types/jest", "@types/node", "@babel/core", "@babel/preset-env", "@babel/preset-typescript"],
        "ignore-patterns": [OUTPUT_DIR],
    };

    if (packageToLint.config.type === PackageType.REACT_APP) {
        depcheckRc.ignores.push("react-scripts", "sass");
    }

    if (packageToLint.config.type === PackageType.TYPESCRIPT_CLI) {
        depcheckRc.ignores.push("esbuild", "@yarnpkg/esbuild-plugin-pnp");
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
