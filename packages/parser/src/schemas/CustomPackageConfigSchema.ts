import { z } from "zod";

export const CustomPackageConfigSchema = z.strictObject({
    type: z.optional(z.literal("custom")).default("custom"),
});
