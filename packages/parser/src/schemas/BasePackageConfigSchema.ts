import { z } from "zod";

export const BasePackageConfigSchema = z.strictObject({
    private: z.optional(z.boolean()).default(true),
});
