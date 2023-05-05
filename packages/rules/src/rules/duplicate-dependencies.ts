import { getPackageJson, getRuleConfig, Result, Rule, RuleType } from "@mrlint/commons";
import produce from "immer";
import { omit } from "lodash-es";
import semver from "semver";

type DependencyName = string;
type DependencyVersion = string;

export const DuplicateDependenciesRule: Rule.MonorepoRule = {
    ruleId: "duplicate-dependencies",
    type: RuleType.MONOREPO,
    run: runRule,
};

interface RuleConfig {
    exclude?: string[];
}

async function runRule({ monorepo, getLoggerForPackage, fileSystems }: Rule.MonorepoRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const latestVersions: Record<DependencyName, DependencyVersion> = {};

    // find latest version of each package
    for (const p of monorepo.packages) {
        const packageJson = await getPackageJson(fileSystems.getFileSystemForPackage(p), getLoggerForPackage(p));
        if (packageJson == null) {
            result.fail();
            continue;
        }

        addDependencies({
            dependencies: packageJson.dependencies,
            latestVersions,
        });
        addDependencies({
            dependencies: packageJson.devDependencies,
            latestVersions,
        });
    }

    // upgrade all dependencies to use latest version
    for (const p of monorepo.packages) {
        const fileSystemForPackage = fileSystems.getFileSystemForPackage(p);
        const packageJson = await getPackageJson(fileSystemForPackage, getLoggerForPackage(p));
        if (packageJson == null) {
            result.fail();
            continue;
        }

        const ruleConfig = p.config?.rules[DuplicateDependenciesRule.ruleId];
        const castedRuleConfig = getRuleConfig<RuleConfig>(ruleConfig);
        const latestVersionsWithoutIgnores = omit(latestVersions, castedRuleConfig?.exclude ?? []);

        const newPackageJson = produce(packageJson, (draft) => {
            upgradeDependencies({
                dependencies: draft.dependencies,
                latestVersions: latestVersionsWithoutIgnores,
            });
            upgradeDependencies({
                dependencies: draft.devDependencies,
                latestVersions: latestVersionsWithoutIgnores,
            });
        });

        await fileSystemForPackage.writeFile("package.json", JSON.stringify(newPackageJson));
    }

    return result;
}

function addDependencies({
    dependencies,
    latestVersions,
}: {
    dependencies: Record<string, string> | undefined;
    latestVersions: Record<DependencyName, DependencyVersion>;
}) {
    if (dependencies == null) {
        return;
    }

    for (const [dependency, version] of Object.entries(dependencies)) {
        const existing = latestVersions[dependency];

        if (existing == null) {
            latestVersions[dependency] = version;
        } else {
            const validRangeOfVersion = semver.validRange(version);
            const validRangeOfExisting = semver.validRange(existing);
            if (validRangeOfVersion != null && validRangeOfExisting != null) {
                const minOfVersion = semver.minVersion(validRangeOfVersion);
                const minOfExisting = semver.minVersion(validRangeOfExisting);
                if (minOfVersion != null && minOfExisting != null && minOfVersion.compare(minOfExisting) === 1) {
                    latestVersions[dependency] = version;
                }
            }
        }
    }
}

function upgradeDependencies({
    dependencies,
    latestVersions,
}: {
    dependencies: Record<string, string> | undefined;
    latestVersions: Record<DependencyName, DependencyVersion>;
}) {
    if (dependencies == null) {
        return;
    }

    for (const [dependency, version] of Object.entries(dependencies)) {
        dependencies[dependency] = latestVersions[dependency] ?? version;
    }
}
