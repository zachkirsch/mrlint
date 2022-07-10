import { LintablePackage, Monorepo, MonorepoLoggers, Package, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import { rules } from "@fern-api/mrlint-rules";
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
        loggers: MonorepoLoggers;
        shouldFix: boolean;
    }
}

export async function lintMonorepo({ monorepo, loggers, shouldFix }: lintMonorepo.Args): Promise<Result> {
    const result = Result.success();

    const fileSystem = new LazyVirtualFileSystem(monorepo.root.fullPath);
    const fileSystems: Rule.FileSystems = {
        getFileSystemForMonorepo: () => fileSystem,
        getFileSystemForPackage: (p) => fileSystem.getFileSystemForPrefix(p.relativePath),
    };

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
                rules: getRulesForPackage(packageToLint),
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

    // run monorepo rules
    for (const rule of rules) {
        if (rule.type === RuleType.MONOREPO) {
            result.accumulate(
                await rule.run({
                    monorepo,
                    fileSystems,
                    logger: loggers.getLoggerForRule({ rule, package: undefined }),
                    getLoggerForPackage: (p) => loggers.getLoggerForRule({ rule, package: p }),
                })
            );
        }
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

function getRulesForPackage(mrlintPackage: LintablePackage): Rule.PackageRule[] {
    return rules.reduce<Rule.PackageRule[]>((filtered, rule) => {
        if (rule.type === RuleType.PACKAGE && ruleAppliesToPackage(rule, mrlintPackage)) {
            filtered.push(rule);
        }
        return filtered;
    }, []);
}

function ruleAppliesToPackage(rule: Rule.PackageRule, mrlintPackage: LintablePackage): boolean {
    return mrlintPackage.config.type != null && rule.targetedPackages.includes(mrlintPackage.config.type);
}
