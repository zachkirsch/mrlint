import { getPackageJson, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
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
    relativePathToRoot,
    logger,
    addDevDependency,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);

    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystemForPackage,
            filename: "jest.config.ts",
            contents: `export { default } from "${path.join(relativePathToSharedConfigs, "jest.config.shared")}";`,
            logger,
        })
    );

    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystemForPackage,
            filename: "babel.config.cjs",
            contents: `module.exports = require("${path.join(relativePathToRoot, "babel.config.json")}");`,
            logger,
        })
    );

    const packageJson = getPackageJson(fileSystemForPackage, logger);
    if (packageJson == null) {
        result.fail();
    } else {
        for (const dependency of EXPECTED_DEV_DEPENDENCIES) {
            addDevDependency(dependency);
        }
    }

    return result;
}
