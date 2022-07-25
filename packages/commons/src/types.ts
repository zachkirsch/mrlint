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

export interface LintablePackage extends Package {
    config: NonNullable<Package["config"]>;
}

export type PackageConfig =
    | ReactAppPackageConfig
    | ReactLibraryPackageConfig
    | TypescriptLibraryPackageConfig
    | TypescriptCliPackageConfig
    | CustomPackageConfig;

export interface ReactAppPackageConfig extends BasePackageConfig {
    type: typeof PackageType.REACT_APP;
}

export interface ReactLibraryPackageConfig extends BasePackageConfig {
    type: typeof PackageType.REACT_LIBRARY;
}

export interface TypescriptLibraryPackageConfig extends BasePackageConfig {
    type: typeof PackageType.TYPESCRIPT_LIBRARY;
}

export interface TypescriptCliPackageConfig extends BasePackageConfig {
    type: typeof PackageType.TYPESCRIPT_CLI;
    cliName: string | undefined;
    environmentVariables: string[];
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
