import { z } from "zod";

export const ReactAppEnvironmentConfigSchema = z.strictObject({
    environments: z.array(z.string()),
    variables: z.optional(z.array(z.string())),
});
