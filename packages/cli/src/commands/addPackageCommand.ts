import { addPackage } from "@fern-api/mrlint-add-package";
import { MonorepoLoggers } from "@fern-api/mrlint-commons";
import { parseMonorepo } from "@fern-api/mrlint-parser";

export async function addPackageCommand({ loggers }: { loggers: MonorepoLoggers }): Promise<void> {
    const monorepo = await parseMonorepo();
    await addPackage({
        monorepo,
        loggers,
    });
}
