import { z } from "zod";
import { ReactAppEnvironmentConfigSchema } from "./EnvironmentConfigSchema";

export const ReactAppPackageConfigSchema = z.strictObject({
    type: z.literal("react-app"),
    environment: z.optional(ReactAppEnvironmentConfigSchema),
});
