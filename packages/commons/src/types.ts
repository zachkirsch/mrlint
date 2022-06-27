import { IPackageJson } from "package-json-type";

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
    sharedConfigs: string;
    repository: string;
}

export interface Package {
    relativePath: string;
    config: PackageConfig | undefined;
    packageJson: IPackageJson | undefined;
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
    type: PackageType.REACT_APP;
}

export interface ReactLibraryPackageConfig extends BasePackageConfig {
    type: PackageType.REACT_LIBRARY;
}

export interface TypescriptLibraryPackageConfig extends BasePackageConfig {
    type: PackageType.TYPESCRIPT_LIBRARY;
}

export interface TypescriptCliPackageConfig extends BasePackageConfig {
    type: PackageType.TYPESCRIPT_CLI;
    cliName: string | undefined;
    pathToCli: string;
}

export interface CustomPackageConfig extends BasePackageConfig {
    type: PackageType.CUSTOM;
}

export interface BasePackageConfig {
    private: boolean;
    rules: Record<string, unknown>;
}

export enum PackageType {
    REACT_APP = "REACT_APP",
    REACT_LIBRARY = "REACT_LIBRARY",
    TYPESCRIPT_LIBRARY = "TYPESCRIPT_LIBRARY",
    TYPESCRIPT_CLI = "TYPESCRIPT_CLI",
    CUSTOM = "CUSTOM",
}
