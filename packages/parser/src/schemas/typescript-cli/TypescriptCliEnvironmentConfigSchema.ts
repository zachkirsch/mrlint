import { z } from "zod";
import { TypescriptCliPackageInfoSchema } from "./TypescriptCliPackageInfoSchema";

export const TypescriptCliEnvironmentConfigSchema = z.strictObject({
    environments: z.optional(z.record(TypescriptCliPackageInfoSchema)),
    variables: z.optional(z.array(z.string())),
});
