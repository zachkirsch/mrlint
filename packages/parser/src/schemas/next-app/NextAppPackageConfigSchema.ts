import { z } from "zod";

export const NextAppPackageConfigSchema = z.strictObject({
    type: z.literal("next-app"),
});
