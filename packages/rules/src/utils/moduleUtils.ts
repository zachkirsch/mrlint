import path from "path";

export type ModuleType = "esm" | "cjs";
const MODULE_TYPES_MAP: Record<ModuleType, true> = { esm: true, cjs: true };
export const MODULE_TYPES = keys(MODULE_TYPES_MAP);

export const OUTPUT_DIR = "lib";
export const CJS_OUTPUT_DIR = path.join(OUTPUT_DIR, "cjs");
export const ESM_OUTPUT_DIR = path.join(OUTPUT_DIR, "esm");

export function getTsconfigFilenameForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return "tsconfig.json";
        default:
            return `tsconfig.${type}.json`;
    }
}

export function getOutputDirForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return ESM_OUTPUT_DIR;
        case "cjs":
            return CJS_OUTPUT_DIR;
    }
}

function keys<T>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}
