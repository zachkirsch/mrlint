import { z } from "zod";
import { ReactAppEnvironmentConfigSchema } from "../ReactAppEnvironmentConfigSchema";

export const NextAppPackageConfigSchema = z.strictObject({
    type: z.literal("next-app"),
    environment: z.optional(ReactAppEnvironmentConfigSchema),
});
