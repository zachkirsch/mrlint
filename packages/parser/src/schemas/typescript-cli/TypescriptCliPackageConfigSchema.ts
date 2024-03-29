import { z } from "zod";
import { TypescriptCliEnvironmentConfigSchema } from "./TypescriptCliEnvironmentConfigSchema";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.string(),
    additionalFiles: z.optional(z.array(z.string())),
    environment: z.optional(TypescriptCliEnvironmentConfigSchema),
    plugins: z.optional(z.record(z.string())),
});
