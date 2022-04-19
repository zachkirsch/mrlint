import { LintablePackage, Monorepo, MonorepoLoggers, Package, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { LazyVirtualFileSystem } from "@fern-api/mrlint-virtual-file-system";
import {
    addDevDependencies,
    DependencyName,
    PackageName,
    PackageWithRequiredDevDependencies,
} from "./addDevDependencies";
import { handleFileSystemDiffs } from "./handleFileSystemDiffs";
import { lintPackage } from "./package-rules/lintPackage";

export declare namespace lintMonorepo {
    export interface Args {
        monorepo: Monorepo;
        rules: Rule[];
        loggers: MonorepoLoggers;
        shouldFix: boolean;
    }
}

export async function lintMonorepo({ monorepo, rules, loggers, shouldFix }: lintMonorepo.Args): Promise<Result> {
    const result = Result.success();

    const fileSystem = new LazyVirtualFileSystem(monorepo.root.fullPath);
    const fileSystems: Rule.FileSystems = {
        getFileSystemForMonorepo: () => fileSystem,
        getFileSystemForPackage: (p) => fileSystem.getFileSystemForPrefix(p.relativePath),
    };

    const [monorepoRules, packageRules] = partition<Rule.MonorepoRule, Rule.PackageRule>(
        rules,
        (rule): rule is Rule.MonorepoRule => rule.type === RuleType.MONOREPO
    );

    const devDependenciesToAdd: Record<PackageName, PackageWithRequiredDevDependencies> = {};

    const packagesToLint: LintablePackage[] = monorepo.packages.filter(isLintablePackage);
    for (const packageToLint of packagesToLint) {
        const loggerForPackage = loggers.getLoggerForPackage(packageToLint);
        loggerForPackage.debug("Linting...");

        const devDependenciesForPackage = new Set<DependencyName>();

        result.accumulate(
            await lintPackage({
                monorepo,
                packageToLint,
                rules: packageRules.filter((rule) => ruleAppliesToPackage(rule, packageToLint)),
                fileSystems,
                getLoggerForRule: loggers.getLoggerForRule,
                addDevDependency: (dependency) => {
                    devDependenciesForPackage.add(dependency);
                },
            })
        );

        if (devDependenciesForPackage.size > 0) {
            if (packageToLint.packageJson == null) {
                loggerForPackage.error("Cannot add dependencies because package.json does not exist");
            } else if (packageToLint.packageJson.name == null) {
                loggerForPackage.error('Cannot add dependencies because package.json does not have a "name"');
            } else {
                devDependenciesToAdd[packageToLint.packageJson.name] = {
                    package: packageToLint,
                    devDependenciesToAdd: devDependenciesForPackage,
                };
            }
        }

        loggerForPackage.debug("Done linting.");
    }

    for (const monorepoRule of monorepoRules) {
        result.accumulate(
            await monorepoRule.run({
                monorepo,
                fileSystems,
                logger: loggers.getLoggerForRule({ rule: monorepoRule, package: undefined }),
            })
        );
    }

    result.accumulate(
        await handleFileSystemDiffs({
            fileSystem,
            logger: loggers.getLogger(),
            shouldFix,
        })
    );

    result.accumulate(
        await addDevDependencies({
            devDependencies: devDependenciesToAdd,
            shouldFix,
            loggers,
        })
    );

    return result;
}

function partition<A, B>(items: readonly (A | B)[], predicate: (item: A | B) => item is A): [A[], B[]] {
    const aList: A[] = [];
    const bList: B[] = [];
    for (const item of items) {
        if (predicate(item)) {
            aList.push(item);
        } else {
            bList.push(item);
        }
    }
    return [aList, bList];
}

function ruleAppliesToPackage(rule: Rule.PackageRule, mrlintPackage: LintablePackage): boolean {
    return mrlintPackage.config.type != null && rule.targetedPackages.includes(mrlintPackage.config.type);
}

function isLintablePackage(p: Package): p is LintablePackage {
    return getLintablePackage(p) != null;
}

function getLintablePackage(p: Package): LintablePackage | undefined {
    if (p.config == null) {
        return undefined;
    }
    return {
        ...p,
        config: p.config,
    };
}
