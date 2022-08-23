import { MonorepoRoot } from "@mrlint/commons";
import findUp from "find-up";
import path from "path";
import { z } from "zod";
import { getRepository } from "./getRepository";
import { readConfig } from "./readConfig";

const MONOREPO_ROOT_FILES = [".mrlint.root.json", ".mrlint.root.yml"];

const RootConfigSchema = z.strictObject({
    defaultScope: z.string(),
    packages: z.string(),
});

export async function getMonorepoRoot(): Promise<MonorepoRoot> {
    const configPath = await findUp(MONOREPO_ROOT_FILES);
    if (configPath == null) {
        throw new Error("Failed to find mrlint root config");
    }

    const config = await readConfig(configPath, (contents) => RootConfigSchema.parseAsync(contents));
    if (config == null) {
        throw new Error("Failed to read config: " + configPath);
    }

    const fullPath = path.dirname(configPath);

    return {
        fullPath,
        config: {
            defaultScopeWithAtSign: config.defaultScope.startsWith("@")
                ? config.defaultScope
                : `@${config.defaultScope}`,
            packages: config.packages,
            absolutePathToSharedConfigs: path.join(fullPath, "shared"),
            absolutePathToScripts: path.join(fullPath, "scripts"),
            repository: await getRepository(),
        },
    };
}
