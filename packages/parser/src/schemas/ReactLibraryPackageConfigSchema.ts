import { z } from "zod";

export const ReactLibraryPackageConfigSchema = z.strictObject({
    type: z.literal("react-library"),
});
