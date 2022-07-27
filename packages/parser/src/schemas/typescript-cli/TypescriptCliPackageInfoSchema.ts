import { z } from "zod";

export const TypescriptCliPackageInfoSchema = z.strictObject({
    cliPackageName: z.string(),
    cliName: z.string(),
});
