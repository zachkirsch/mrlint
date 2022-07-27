import { Monorepo, Result, Rule } from "@mrlint/commons";
import path from "path";

export declare namespace runRuleOnPackage {
    export interface Args
        extends Pick<Rule.PackageRuleRunnerArgs, "packageToLint" | "logger" | "fileSystems" | "addDevDependency"> {
        monorepo: Monorepo;
        rule: Rule.PackageRule;
    }
}

export async function runRuleOnPackage({
    monorepo,
    packageToLint,
    rule,
    fileSystems,
    logger,
    addDevDependency,
}: runRuleOnPackage.Args): Promise<Result> {
    const absolutePathToPackage = path.join(monorepo.root.fullPath, packageToLint.relativePath);

    logger.debug("Running rule...");

    let result = Result.success();
    try {
        result = await rule.run({
            packageToLint,
            allPackages: monorepo.packages,
            relativePathToRoot: path.relative(absolutePathToPackage, monorepo.root.fullPath),
            relativePathToSharedConfigs: path.relative(
                absolutePathToPackage,
                monorepo.root.config.absolutePathToSharedConfigs
            ),
            relativePathToScripts: path.relative(absolutePathToPackage, monorepo.root.config.absolutePathToScripts),
            fileSystems,
            logger,
            addDevDependency,
            ruleConfig: packageToLint.config.rules[rule.ruleId],
            repository: monorepo.root.config.repository,
        });
    } catch (error) {
        logger.error({
            message: "Encountered exception when running rule",
            error,
        });
        result.fail();
    }

    logger.debug("Done running rule.");

    return result;
}
