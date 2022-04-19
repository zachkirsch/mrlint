import { z } from "zod";

export const TypescriptLibraryPackageConfigSchema = z.strictObject({
    type: z.literal("library"),
});
