import { MonorepoLoggers } from "@fern-api/mrlint-commons";
import { createPackage } from "@fern-api/mrlint-create-package";
import { parseMonorepo } from "@fern-api/mrlint-parser";

export async function createPackageCommand({ loggers }: { loggers: MonorepoLoggers }): Promise<void> {
    const monorepo = await parseMonorepo();
    await createPackage({
        monorepo,
        loggers,
    });
}
