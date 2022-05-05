import { MonorepoRoot } from "@fern-api/mrlint-commons";
import findUp from "find-up";
import path from "path";
import { z } from "zod";
import { readConfig } from "./readConfig";

const MONOREPO_ROOT_FILES = [".mrlint.root.json", ".mrlint.root.yml"];

const RootConfigSchema = z.strictObject({
    packages: z.string(),
    sharedConfigs: z.string(),
});

export async function getMonorepoRoot(): Promise<MonorepoRoot> {
    const configPath = await findUp(MONOREPO_ROOT_FILES);
    if (configPath == null) {
        throw new Error("Failed to find mrlint root config");
    }

    const config = await readConfig(configPath, (contents) => RootConfigSchema.parse(contents));
    if (config == null) {
        throw new Error("Failed to read config: " + configPath);
    }

    return {
        fullPath: path.dirname(configPath),
        config,
    };
}
