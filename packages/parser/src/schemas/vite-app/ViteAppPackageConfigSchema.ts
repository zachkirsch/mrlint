import { z } from "zod";

export const ViteAppPackageConfigSchema = z.strictObject({
    type: z.literal("vite-app"),
});
