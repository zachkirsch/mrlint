import { z } from "zod";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.string(),
    cliPackageName: z.optional(z.string()),
    environmentVariables: z.optional(z.array(z.string())),
});
