import { z } from "zod";
import { BasePackageConfigSchema } from "./BasePackageConfigSchema";
import { CustomPackageConfigSchema } from "./CustomPackageConfigSchema";
import { NextAppPackageConfigSchema } from "./next-app/NextAppPackageConfigSchema";
import { ReactLibraryPackageConfigSchema } from "./ReactLibraryPackageConfigSchema";
import { TypescriptCliPackageConfigSchema } from "./typescript-cli/TypescriptCliPackageConfigSchema";
import { TypescriptLibraryPackageConfigSchema } from "./TypescriptLibraryPackageConfigSchema";
import { ViteAppPackageConfigSchema } from "./vite-app/ViteAppPackageConfigSchema";

export const PackageConfigSchema = z.union([
    BasePackageConfigSchema.merge(CustomPackageConfigSchema),
    BasePackageConfigSchema.merge(ViteAppPackageConfigSchema),
    BasePackageConfigSchema.merge(NextAppPackageConfigSchema),
    BasePackageConfigSchema.merge(ReactLibraryPackageConfigSchema),
    BasePackageConfigSchema.merge(TypescriptLibraryPackageConfigSchema),
    BasePackageConfigSchema.merge(TypescriptCliPackageConfigSchema),
]);

export type PackageConfigSchema = z.infer<typeof PackageConfigSchema>;
