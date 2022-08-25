import { z } from "zod";

export const BasePackageConfigSchema = z.strictObject({
    private: z.optional(z.boolean()).default(true),
    commonJs: z.optional(z.boolean()),
    rules: z.optional(z.record(z.unknown())),
});
