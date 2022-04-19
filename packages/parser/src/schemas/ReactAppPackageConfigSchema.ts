import { z } from "zod";

export const ReactAppPackageConfigSchema = z.strictObject({
    type: z.literal("react-app"),
});
