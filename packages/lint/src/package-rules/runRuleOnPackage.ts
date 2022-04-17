import { Monorepo, Result, Rule } from "@fern-api/mrlint-commons";
import path from "path/posix";

export declare namespace runRuleOnPackage {
    export interface Args extends Pick<Rule.PackageRuleRunnerArgs, "packageToLint" | "logger" | "fileSystems"> {
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
}: runRuleOnPackage.Args): Promise<Result> {
    const relativePathToRoot = path.relative(
        path.join(monorepo.root.fullPath, packageToLint.relativePath),
        monorepo.root.fullPath
    );

    logger.debug({
        message: "Running rule...",
    });

    let result = Result.success();
    try {
        result = await rule.run({
            packageToLint,
            allPackages: monorepo.packages,
            relativePathToRoot,
            relativePathToSharedConfigs: path.join(relativePathToRoot, monorepo.root.config.sharedConfigs),
            fileSystems,
            logger,
        });
    } catch (error) {
        logger.error({
            message: "Encountered exception when running rule",
            error,
        });
        result.fail();
    }

    logger.debug({
        message: "Done running rule.",
    });

    return result;
}
