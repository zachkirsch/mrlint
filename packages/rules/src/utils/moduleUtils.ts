import path from "path";

export type ModuleType = "esm" | "cjs";
const MODULE_TYPES_MAP: Record<ModuleType, true> = { esm: true, cjs: true };
export const MODULE_TYPES = keys(MODULE_TYPES_MAP);

export const OUTPUT_DIR = "dist";
export const CJS_OUTPUT_DIR = path.join(OUTPUT_DIR, "cjs");
export const ESM_OUTPUT_DIR = path.join(OUTPUT_DIR, "esm");

export function getTsconfigFilenameForType(type: ModuleType): string {
    return `tsconfig.${type}.json`;
}

function keys<T>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}
