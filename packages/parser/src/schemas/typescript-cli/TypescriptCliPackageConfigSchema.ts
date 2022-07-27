import { z } from "zod";
import { TypescriptCliEnvironmentConfigSchema } from "./TypescriptCliEnvironmentConfigSchema";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.string(),
    environment: z.optional(TypescriptCliEnvironmentConfigSchema),
});
