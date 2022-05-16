import { Logger, Package, PackageType, Result, Rule, RuleType } from "@fern-api/mrlint-commons";
import path from "path";
import { CompilerOptions, ProjectReference } from "typescript";
import { keyPackagesByNpmName } from "../utils/keyPackagesByNpmName";
import {
    CJS_OUTPUT_DIR,
    ESM_OUTPUT_DIR,
    getTsconfigFilenameForType,
    ModuleType,
    MODULE_TYPES,
} from "../utils/moduleUtils";
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

export type TsConfig = {
    extends?: string;
    compilerOptions?: CompilerOptions;
    include?: string[];
    references: ProjectReference[];
};

async function runRule({
    fileSystems,
    relativePathToSharedConfigs,
    packageToLint,
    allPackages,
    logger,
}: Rule.PackageRuleRunnerArgs): Promise<Result> {
    const result = Result.success();

    for (const moduleType of MODULE_TYPES) {
        result.accumulate(
            await generateTsConfigForModuleType({
                packageToLint,
                allPackages,
                relativePathToSharedConfigs,
                logger,
                fileSystems,
                moduleType,
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
}: {
    packageToLint: Package;
    allPackages: readonly Package[];
    relativePathToSharedConfigs: string;
    logger: Logger;
    fileSystems: Rule.FileSystems;
    moduleType: ModuleType;
}): Promise<Result> {
    let tsConfig: TsConfig;
    try {
        tsConfig = await generateTsConfig({
            packageToLint,
            allPackages,
            relativePathToSharedConfigs,
            logger,
            moduleType,
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
}: {
    packageToLint: Package;
    allPackages: readonly Package[];
    relativePathToSharedConfigs: string;
    logger: Logger;
    moduleType: ModuleType;
}): Promise<TsConfig> {
    const packageJson = tryGetPackageJson(packageToLint, logger);
    if (packageJson == null) {
        throw new Error("package.json does not exist");
    }
    const packagesByNpmName = keyPackagesByNpmName(allPackages);

    return {
        extends: path.join(relativePathToSharedConfigs, "tsconfig.shared.json"),
        compilerOptions: generateCompilerOptions(moduleType),
        include: ["./src"],
        references: Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })
            .reduce<string[]>((acc, [dependency, version]) => {
                if (version.startsWith("workspace:")) {
                    const packageOfDependency = packagesByNpmName[dependency];
                    if (packageOfDependency == null) {
                        throw new Error("Workspace dependency not found: " + dependency);
                    }
                    acc.push(path.relative(packageToLint.relativePath, packageOfDependency.relativePath));
                }
                return acc;
            }, [])
            .sort()
            .map((pathToReference) => ({ path: path.join(pathToReference, getTsconfigFilenameForType(moduleType)) })),
    };
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

    const tsBuildInfoFile = getTsBuildInfoFilenameForType(moduleType);
    if (tsBuildInfoFile != null) {
        compilerOptions.tsBuildInfoFile = tsBuildInfoFile;
    }

    return compilerOptions;
}

function getModuleForType(type: ModuleType): string | undefined {
    switch (type) {
        case "esm":
            return undefined;
        case "cjs":
            return "CommonJS";
    }
}

function getOutputDirForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return ESM_OUTPUT_DIR;
        case "cjs":
            return CJS_OUTPUT_DIR;
    }
}

function getTsBuildInfoFilenameForType(type: ModuleType): string | undefined {
    switch (type) {
        case "esm":
            return undefined;
        default:
            return `tsconfig.${type}.tsbuildinfo`;
    }
}
