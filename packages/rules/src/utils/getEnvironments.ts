import { PackageType, ReactAppPackageConfig, TypescriptCliPackageConfig } from "@mrlint/commons/src/types";

export function getEnvironments(config: ReactAppPackageConfig | TypescriptCliPackageConfig): string[] {
    switch (config.type) {
        case PackageType.REACT_APP:
            return config.environment.environments;
        case PackageType.TYPESCRIPT_CLI:
            return Object.keys(config.environment.environments).sort();
    }
}
