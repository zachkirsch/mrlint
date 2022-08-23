import { addWorkspace } from "@mrlint/add-workspace";
import { MonorepoLoggers } from "@mrlint/commons";
import { parseMonorepo } from "@mrlint/parser";

export async function addWorkspaceCommand({ loggers }: { loggers: MonorepoLoggers }): Promise<void> {
    const monorepo = await parseMonorepo();
    await addWorkspace({
        monorepo,
        loggers,
    });
}
