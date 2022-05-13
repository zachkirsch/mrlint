import { CJS_OUTPUT_DIR } from "@fern-api/mrlint-rules";
import path from "path";
import { z } from "zod";

export const TypescriptCliPackageConfigSchema = z.strictObject({
    type: z.literal("cli"),
    cliName: z.optional(z.string()),
    pathToCli: z.optional(z.string()).default(`./${path.join(CJS_OUTPUT_DIR, "cli.js")}`),
});
