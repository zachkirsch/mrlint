import { z } from "zod";

export const TypescriptCliPackageInfoSchema = z.strictObject({
    cliName: z.string(),
    cliPackageName: z.optional(z.string()),
});
