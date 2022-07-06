import { PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
import { tryGetPackageJson } from "../utils/tryGetPackageJson";
import { writePackageFile } from "../utils/writePackageFile";

export const JestRule: Rule.PackageRule = {
    ruleId: "jest",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

const EXPECTED_DEV_DEPENDENCIES = [
    "jest",
    "@types/jest",
    "@babel/core",
    "@babel/preset-env",
    "@babel/preset-typescript",
    "ts-jest",
];

async function runRule({
    fileSystems,
    packageToLint,
    relativePathToSharedConfigs,
    logger,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
            filename: "jest.config.ts",
            contents: `import packageConfig from "${path.join(relativePathToSharedConfigs, "jest.config.shared")}";
            
export default packageConfig;`,
            logger,
        })
    );

    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
            filename: "babel.config.js",
            contents: `module.exports = require("${path.join(
                relativePathToSharedConfigs,
                "babel.config.shared.json"
            )}");`,
            logger,
        })
    );

    const packageJson = tryGetPackageJson(packageToLint, logger);
    if (packageJson == null) {
        result.fail();
    } else {
        for (const dependency of EXPECTED_DEV_DEPENDENCIES) {
            addDevDependency(dependency);
        }
    }

    return result;
}
