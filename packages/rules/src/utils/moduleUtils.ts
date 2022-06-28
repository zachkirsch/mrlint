import path from "path";

export type ModuleType = "cjs" | "esm";
const MODULE_TYPES_MAP: Record<ModuleType, true> = {
    // this order is used to determined compilation order.
    // we compile CJS first since that's where the declaration types live.
    cjs: true,
    esm: true,
};
export const MODULE_TYPES = keys(MODULE_TYPES_MAP);

export const OUTPUT_DIR = "lib";
export const CJS_OUTPUT_DIR = path.join(OUTPUT_DIR, "cjs");
export const ESM_OUTPUT_DIR = path.join(OUTPUT_DIR, "esm");

export function getTsconfigFilenameForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return "tsconfig.esm.json";
        default:
            return "tsconfig.json";
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
