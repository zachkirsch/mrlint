import path from "path";

export const DEFAULT_MODULE_TYPE: ModuleType = "esm";

export type ModuleType = "cjs" | "esm";
const MODULE_TYPES_MAP: Record<ModuleType, true> = {
    esm: true,
    cjs: true,
};
export const MODULE_TYPES = keys(MODULE_TYPES_MAP)
    // make sure the default module type is first, since we need to
    // compile that first (since it contains the type declarations)
    .sort((a) => (a === DEFAULT_MODULE_TYPE ? -1 : 1));

export const OUTPUT_DIR = "lib";
export const CJS_OUTPUT_DIR = path.join(OUTPUT_DIR, "cjs");
export const ESM_OUTPUT_DIR = path.join(OUTPUT_DIR, "esm");

export function getOutputDirForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return ESM_OUTPUT_DIR;
        case "cjs":
            return CJS_OUTPUT_DIR;
    }
}

export function getModuleForType(type: ModuleType): string {
    switch (type) {
        case "esm":
            return "esnext";
        case "cjs":
            return "CommonJS";
    }
}

function keys<T>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}
