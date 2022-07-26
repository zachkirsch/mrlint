import {
    getPackageJson,
    LintablePackage,
    Monorepo,
    MonorepoLoggers,
    Package,
    Result,
    Rule,
    RuleType,
} from "@fern-api/mrlint-commons";
import { rules } from "@fern-api/mrlint-rules";
import { LazyVirtualFileSystem } from "@fern-api/mrlint-virtual-file-system";
import {
    addDevDependencies,
    DependencyName,
    DependencyVersions,
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

        const devDependenciesForPackage: Record<DependencyName, DependencyVersions> = {};

        result.accumulate(
            await lintPackage({
                monorepo,
                packageToLint,
                rules: getRulesForPackage(packageToLint),
                fileSystems,
                getLoggerForRule: loggers.getLoggerForRule,
                addDevDependency: (dependency, version) => {
                    const versions = (devDependenciesForPackage[dependency] ??= { requestedVersions: new Set() });
                    if (version != null) {
                        versions.requestedVersions.add(version);
                    }
                },
            })
        );

        if (Object.keys(devDependenciesForPackage).length > 0) {
            const packageJson = await getPackageJson(
                fileSystems.getFileSystemForPackage(packageToLint),
                loggerForPackage
            );
            if (packageJson != null) {
                devDependenciesToAdd[packageJson.name] = {
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
            getFileSystemForPackage: fileSystems.getFileSystemForPackage,
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
        const castedRule = rule as Rule.PackageRule;
        if (rule.type === RuleType.PACKAGE && ruleAppliesToPackage(castedRule, mrlintPackage)) {
            filtered.push(castedRule);
        }
        return filtered;
    }, []);
}

function ruleAppliesToPackage(rule: Rule.PackageRule, mrlintPackage: LintablePackage): boolean {
    return mrlintPackage.config.type != null && rule.targetedPackages.includes(mrlintPackage.config.type);
}
