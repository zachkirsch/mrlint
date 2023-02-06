export interface Monorepo {
    root: MonorepoRoot;
    packages: Package[];
}

export interface MonorepoRoot {
    fullPath: string;
    config: RootConfig;
}

export interface RootConfig {
    defaultScopeWithAtSign: string;
    packages: string;
    absolutePathToSharedConfigs: string;
    absolutePathToScripts: string;
    repository: string;
}

export interface Package {
    name: string | undefined;
    relativePath: string;
    config: PackageConfig | undefined;
}

export interface LintablePackage<T extends PackageType = PackageType> extends Package {
    config: NonNullable<PackageOfType<T>["config"]>;
}

export type PackageOfType<T extends PackageType> = PackageConfig extends { type: infer InferredT }
    ? InferredT extends T
        ? Package & { config: (PackageConfig & { type: T }) | undefined }
        : never
    : never;

export type PackageConfig =
    | ReactAppPackageConfig
    | ReactLibraryPackageConfig
    | TypescriptLibraryPackageConfig
    | TypescriptCliPackageConfig
    | CustomPackageConfig;

export interface ReactAppPackageConfig extends BasePackageConfig {
    type: typeof PackageType.REACT_APP;
    environment: ReactAppEnvironmentConfig;
}

export interface ReactAppEnvironmentConfig {
    environments: string[];
    variables: string[];
}

export interface ReactLibraryPackageConfig extends BasePackageConfig {
    type: typeof PackageType.REACT_LIBRARY;
}

export interface TypescriptLibraryPackageConfig extends BasePackageConfig {
    type: typeof PackageType.TYPESCRIPT_LIBRARY;
}

export interface TypescriptCliPackageConfig extends BasePackageConfig {
    type: typeof PackageType.TYPESCRIPT_CLI;
    cliName: string;
    environment: CliEnvironmentConfig;
    plugins: Record<string, string>;
}

export interface CliEnvironmentConfig {
    environments: Record<string, CliPackageInfo>;
    variables: string[];
}

export interface CliPackageInfo {
    cliPackageName: string | undefined;
    cliName: string;
}

export interface CustomPackageConfig extends BasePackageConfig {
    type: typeof PackageType.CUSTOM;
}

export interface BasePackageConfig {
    private: boolean;
    isCommonJs: boolean;
    rules: Record<string, unknown>;
}

export const PackageType = {
    REACT_APP: "React app",
    REACT_LIBRARY: "React library",
    TYPESCRIPT_LIBRARY: "TypeScript library",
    TYPESCRIPT_CLI: "TypeScript CLI",
    CUSTOM: "Custom",
} as const;
export type PackageType = typeof PackageType[keyof typeof PackageType];
