import { getRuleConfig, Logger, Package, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
import { CompilerOptions, ProjectReference } from "typescript";
import { getDependencies } from "../utils/getDependencies";
import { keyPackagesByNpmName } from "../utils/keyPackagesByNpmName";
import { getOutputDirForType, getTsconfigFilenameForType, ModuleType, MODULE_TYPES } from "../utils/moduleUtils";
import { tryGetPackageJson } from "../utils/tryGetPackageJson";
import { writePackageFile } from "../utils/writePackageFile";

export const TsConfigRule: Rule.PackageRule = {
    ruleId: "ts-config",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

interface RuleConfig {
    exclude?: string[];
}

export type TsConfig = {
    extends?: string;
    compilerOptions?: CompilerOptions;
    include?: string[];
    exclude?: string[];
    references?: ProjectReference[];
};

async function runRule({
    fileSystems,
    relativePathToSharedConfigs,
    packageToLint,
    allPackages,
    logger,
    ruleConfig,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    const castedRuleConfig = getRuleConfig<RuleConfig>(ruleConfig);

    for (const moduleType of MODULE_TYPES) {
        result.accumulate(
            await generateTsConfigForModuleType({
                packageToLint,
                allPackages,
                relativePathToSharedConfigs,
                logger,
                fileSystems,
                moduleType,
                exclude: castedRuleConfig?.exclude ?? [],
            })
        );
    }

    return result;
}

async function generateTsConfigForModuleType({
    packageToLint,
    allPackages,
    relativePathToSharedConfigs,
    logger,
    fileSystems,
    moduleType,
    exclude,
}: {
    packageToLint: Package;
    allPackages: readonly Package[];
    relativePathToSharedConfigs: string;
    logger: Logger;
    fileSystems: Rule.FileSystems;
    moduleType: ModuleType;
    exclude: string[];
}): Promise<Result> {
    let tsConfig: TsConfig;
    try {
        tsConfig = await generateTsConfig({
            packageToLint,
            allPackages,
            relativePathToSharedConfigs,
            logger,
            moduleType,
            exclude,
        });
    } catch (error) {
        logger.error({
            message: "Failed to generate TS Config",
            error,
        });
        return Result.failure();
    }

    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: getTsconfigFilenameForType(moduleType),
        contents: JSON.stringify(tsConfig),
        logger,
    });
}

async function generateTsConfig({
    packageToLint,
    allPackages,
    relativePathToSharedConfigs,
    logger,
    moduleType,
    exclude,
}: {
    packageToLint: Package;
    allPackages: readonly Package[];
    relativePathToSharedConfigs: string;
    logger: Logger;
    moduleType: ModuleType;
    exclude: string[];
}): Promise<TsConfig> {
    const packageJson = tryGetPackageJson(packageToLint, logger);
    if (packageJson == null) {
        throw new Error("package.json does not exist");
    }
    const packagesByNpmName = keyPackagesByNpmName(allPackages);

    const tsConfig: TsConfig = {
        extends: path.join(relativePathToSharedConfigs, "tsconfig.shared.json"),
        compilerOptions: generateCompilerOptions(moduleType),
        include: ["./src"],
    };

    if (exclude.length > 0) {
        tsConfig.exclude = exclude;
    }

    const references = getDependencies(packageJson)
        .reduce<string[]>((acc, { name, version }) => {
            if (version.startsWith("workspace:")) {
                const packageOfDependency = packagesByNpmName[name];
                if (packageOfDependency == null) {
                    throw new Error("Workspace dependency not found: " + name);
                }
                acc.push(path.relative(packageToLint.relativePath, packageOfDependency.relativePath));
            }
            return acc;
        }, [])
        .sort()
        .map((pathToReference) => ({ path: path.join(pathToReference, getTsconfigFilenameForType(moduleType)) }));
    if (references.length > 0) {
        tsConfig.references = references;
    }

    return tsConfig;
}

function generateCompilerOptions(moduleType: ModuleType): CompilerOptions {
    const compilerOptions: CompilerOptions = {
        composite: true,
        outDir: getOutputDirForType(moduleType),
        rootDir: "src",
    };

    const module = getModuleForType(moduleType);
    if (module != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        compilerOptions.module = module as any;
    }

    return compilerOptions;
}

function getModuleForType(type: ModuleType): string | undefined {
    switch (type) {
        case "esm":
            return "esnext";
        case "cjs":
            return "CommonJS";
    }
}
