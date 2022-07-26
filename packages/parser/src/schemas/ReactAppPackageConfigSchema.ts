import { z } from "zod";
import { EnvironmentConfigSchema } from "./EnvironmentConfigSchema";

export const ReactAppPackageConfigSchema = z.strictObject({
    type: z.literal("react-app"),
    environment: z.optional(EnvironmentConfigSchema),
});
