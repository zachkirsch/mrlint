import {
    NextAppPackageConfig,
    PackageConfig,
    PackageType,
    TypescriptCliPackageConfig,
    ViteAppPackageConfig,
} from "@mrlint/commons";

export function getEnvironments(
    config: ViteAppPackageConfig | NextAppPackageConfig | TypescriptCliPackageConfig
): string[] {
    switch (config.type) {
        case PackageType.VITE_APP:
        case PackageType.NEXT_APP:
            return config.environment.environments;
        case PackageType.TYPESCRIPT_CLI:
            return Object.keys(config.environment.environments).sort();
    }
}

export function hasEnvironments(
    packageConfig: PackageConfig
): packageConfig is ViteAppPackageConfig | NextAppPackageConfig | TypescriptCliPackageConfig {
    switch (packageConfig.type) {
        case PackageType.VITE_APP:
        case PackageType.NEXT_APP:
        case PackageType.TYPESCRIPT_CLI:
            return true;
        default:
            return false;
    }
}
