export interface Monorepo {
    root: MonorepoRoot;
    packages: Package[];
}

export interface MonorepoRoot {
    fullPath: string;
    config: RootConfig;
}

export interface RootConfig {
    packages: string;
    absolutePathToSharedConfigs: string;
    absolutePathToScripts: string;
    repository: string;
}

export interface Package {
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
    environment: EnvironmentConfig;
}

export interface EnvironmentConfig {
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
    cliPackageName: string | undefined;
    environment: EnvironmentConfig;
}

export interface CustomPackageConfig extends BasePackageConfig {
    type: typeof PackageType.CUSTOM;
}

export interface BasePackageConfig {
    private: boolean;
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
