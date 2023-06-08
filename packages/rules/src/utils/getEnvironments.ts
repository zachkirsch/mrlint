import { TypescriptCliPackageConfig } from "@mrlint/commons/src/types";

export function getEnvironments(config: TypescriptCliPackageConfig): string[] {
    return Object.keys(config.environment.environments).sort();
}
