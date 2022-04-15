import { IPackageJson } from "package-json-type";

export interface Monorepo {
    root: MonorepoRoot;
    version: string | undefined;
    packages: Package[];
}

export interface MonorepoRoot {
    fullPath: string;
    config: RootConfig;
}

export interface RootConfig {
    packages: string;
    sharedConfigs: string;
}

export interface Package {
    relativePath: string;
    config: PackageConfig | undefined;
    packageJson: IPackageJson | undefined;
}

export interface LintablePackage extends Package {
    config: NonNullable<Package["config"]>;
}

export interface PackageConfig {
    type: PackageType | undefined;
    private: boolean;
}

export enum PackageType {
    REACT_APP = "REACT_APP",
    REACT_LIBRARY = "REACT_LIBRARY",
    TYPESCRIPT_LIBRARY = "TYPESCRIPT_LIBRARY",
    TYPESCRIPT_CLI = "TYPESCRIPT_CLI",
}
