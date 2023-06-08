import {
    getPackageJson,
    getRuleConfig,
    LintablePackage,
    Logger,
    Package,
    PackageType,
    Result,
    Rule,
    RuleType,
} from "@mrlint/commons";
import { FileSystem } from "@mrlint/virtual-file-system";
import path from "path";
import ts, { CompilerOptions, JsxEmit, ProjectReference } from "typescript";
import { OUTPUT_DIR } from "../utils/constants";
import { getDependencies } from "../utils/getDependencies";
import { keyPackagesByNpmName } from "../utils/keyPackagesByNpmName";
import { writePackageFile } from "../utils/writePackageFile";

export const TsConfigRule: Rule.PackageRule = {
    ruleId: "ts-config",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.VITE_APP,
        PackageType.NEXT_APP,
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

    result.accumulate(
        await generateTsConfigForModuleType({
            packageToLint,
            allPackages,
            relativePathToSharedConfigs,
            logger,
            fileSystems,
            exclude: castedRuleConfig?.exclude ?? [],
        })
    );

    return result;
}

async function generateTsConfigForModuleType({
    packageToLint,
    allPackages,
    relativePathToSharedConfigs,
    logger,
    fileSystems,
    exclude,
}: {
    packageToLint: LintablePackage;
    allPackages: readonly Package[];
    relativePathToSharedConfigs: string;
    logger: Logger;
    fileSystems: Rule.FileSystems;
    exclude: string[];
}): Promise<Result> {
    const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);

    let tsConfig: TsConfig;
    try {
        tsConfig = await generateTsConfig({
            packageToLint,
            packagesByNpmName: await keyPackagesByNpmName({
                allPackages,
                getFileSystemForPackage: fileSystems.getFileSystemForPackage,
            }),
            relativePathToSharedConfigs,
            logger,
            exclude,
            fileSystemForPackage,
        });
    } catch (error) {
        logger.error({
            message: "Failed to generate TS Config",
            error,
        });
        return Result.failure();
    }

    return writePackageFile({
        fileSystem: fileSystemForPackage,
        filename: "tsconfig.json",
        contents: JSON.stringify(tsConfig),
        logger,
    });
}

async function generateTsConfig({
    packageToLint,
    packagesByNpmName,
    relativePathToSharedConfigs,
    logger,
    exclude,
    fileSystemForPackage,
}: {
    packageToLint: LintablePackage;
    packagesByNpmName: Record<string, Package>;
    relativePathToSharedConfigs: string;
    logger: Logger;
    exclude: string[];
    fileSystemForPackage: FileSystem;
}): Promise<TsConfig> {
    const packageJson = await getPackageJson(fileSystemForPackage, logger);
    if (packageJson == null) {
        throw new Error("package.json does not exist");
    }

    let compilerOptions: CompilerOptions = {
        composite: true,
        outDir: OUTPUT_DIR,
        rootDir: "src",
    };
    if (packageToLint.config.type === PackageType.NEXT_APP) {
        compilerOptions = {
            ...compilerOptions,
            allowJs: true,
            incremental: true,
            jsx: "preserve" as unknown as JsxEmit,
            plugins: [
                {
                    name: "next",
                },
            ],
        };
    }

    const tsConfig: TsConfig = {
        extends: path.join(relativePathToSharedConfigs, "tsconfig.shared.json"),
        compilerOptions,
        include: ["./src"],
    };

    const exclusionsWithDefaults = [...exclude];
    if (packageToLint.config.type === PackageType.NEXT_APP) {
        exclusionsWithDefaults.push("node_modules");
    }
    if (exclusionsWithDefaults.length > 0) {
        tsConfig.exclude = exclusionsWithDefaults;
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
        .map((pathToReference) => ({ path: pathToReference }));
    if (references.length > 0) {
        tsConfig.references = references;
    }

    if (packageToLint.config.isCommonJs) {
        tsConfig.compilerOptions = {
            ...tsConfig.compilerOptions,
            module: "CommonJS" as unknown as ts.ModuleKind,
        };
    }

    return tsConfig;
}
