import { z } from "zod";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.optional(z.string()),
    pathToCli: z.optional(z.string()),
});
