import { z } from "zod";
import { ReactAppEnvironmentConfigSchema } from "../ReactAppEnvironmentConfigSchema";

export const ViteAppPackageConfigSchema = z.strictObject({
    type: z.literal("vite-app"),
    environment: z.optional(ReactAppEnvironmentConfigSchema),
});
