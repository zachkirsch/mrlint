import { Package, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import produce from "immer";
import { IPackageJson } from "package-json-type";
import semver from "semver";

type DependencyName = string;
type DependencyVersion = string;

export const DuplicateDependenciesRule: Rule.MonorepoRule = {
    ruleId: "duplicate-dependencies",
    type: RuleType.MONOREPO,
    run: runRule,
};

async function runRule({ monorepo, getLoggerForPackage, fileSystems }: Rule.MonorepoRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const latestVersions: Record<DependencyName, DependencyVersion> = {};

    async function getPackageJson(p: Package): Promise<IPackageJson | undefined> {
        const fileSystemForPackage = fileSystems.getFileSystemForPackage(p);
        const packageJsonStr = await fileSystemForPackage.readFile("package.json");
        if (packageJsonStr == null) {
            return undefined;
        }
        return JSON.parse(packageJsonStr) as IPackageJson;
    }

    // find latest version of each package
    for (const p of monorepo.packages) {
        const packageJson = await getPackageJson(p);
        if (packageJson == null) {
            getLoggerForPackage(p).error("Could not read package.json");
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
        const packageJson = await getPackageJson(p);
        if (packageJson == null) {
            continue;
        }

        const newPackageJson = produce(packageJson, (draft) => {
            upgradeDependencies({
                dependencies: draft.dependencies,
                latestVersions,
            });
            upgradeDependencies({
                dependencies: draft.devDependencies,
                latestVersions,
            });
        });

        fileSystems.getFileSystemForPackage(p).writeFile("package.json", JSON.stringify(newPackageJson));
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
                if (minOfVersion != null && minOfExisting != null) {
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
