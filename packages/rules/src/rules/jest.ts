import { getPackageJson, getRuleConfig, PackageType, Result, Rule, RuleType } from "@mrlint/commons";
import path from "path";
import { writePackageFile } from "../utils/writePackageFile";

interface RuleConfig {
    testMatch?: string[];
}

export const JestRule: Rule.PackageRule = {
    ruleId: "jest",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
        PackageType.NEXT_APP,
    ],
    run: runRule,
};

const EXPECTED_DEV_DEPENDENCIES = ["jest", "@types/jest"];

async function runRule({
    fileSystems,
    packageToLint,
    relativePathToSharedConfigs,
    logger,
    addDevDependency,
    ruleConfig,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);

    const castedRuleConfig = getRuleConfig<RuleConfig>(ruleConfig);
    const pathToSharedJestConfig = path.join(relativePathToSharedConfigs, "jest.config.shared");
    result.accumulate(
        await writePackageFile({
            fileSystem: fileSystemForPackage,
            filename: "jest.config.ts",
            contents:
                castedRuleConfig?.testMatch == null
                    ? `export { default } from "${pathToSharedJestConfig}";`
                    : `import defaultConfig from "${pathToSharedJestConfig}";

export default {
    ...defaultConfig,
    testMatch: ${JSON.stringify(castedRuleConfig.testMatch)}
};`,
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
