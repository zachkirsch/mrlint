import { addPackage } from "@mrlint/add-package";
import { MonorepoLoggers } from "@mrlint/commons";
import { parseMonorepo } from "@mrlint/parser";

export async function addPackageCommand({ loggers }: { loggers: MonorepoLoggers }): Promise<void> {
    const monorepo = await parseMonorepo();
    await addPackage({
        monorepo,
        loggers,
    });
}
