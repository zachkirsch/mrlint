import { z } from "zod";
import { EnvironmentConfigSchema } from "./EnvironmentConfigSchema";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.string(),
    cliPackageName: z.optional(z.string()),
    environment: z.optional(EnvironmentConfigSchema),
});
