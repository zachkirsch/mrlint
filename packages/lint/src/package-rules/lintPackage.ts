import { Logger, Monorepo, Package, Result, Rule } from "@fern-api/mrlint-commons";
import { runRuleOnPackage } from "./runRuleOnPackage";

export declare namespace lintPackage {
    export interface Args
        extends Pick<Rule.PackageRuleRunnerArgs, "packageToLint" | "fileSystems" | "addDevDependency"> {
        monorepo: Monorepo;
        rules: Rule.PackageRule[];
        getLoggerForRule: (args: { rule: Rule; package: Package | undefined }) => Logger;
    }
}

export async function lintPackage({
    monorepo,
    packageToLint,
    rules,
    fileSystems,
    getLoggerForRule,
    addDevDependency,
}: lintPackage.Args): Promise<Result> {
    const result = Result.success();
    for (const rule of rules) {
        result.accumulate(
            await runRuleOnPackage({
                monorepo,
                packageToLint,
                rule,
                fileSystems,
                logger: getLoggerForRule({
                    rule,
                    package: packageToLint,
                }),
                addDevDependency,
            })
        );
    }
    return result;
}
