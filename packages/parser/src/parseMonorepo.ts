import { Monorepo } from "@fernapi/mrlint-commons";
import { getAllPackages } from "./getAllPackages";
import { getMonorepoRoot } from "./getMonorepoRoot";

export async function parseMonorepo({ monorepoVersion }: { monorepoVersion: string | undefined }): Promise<Monorepo> {
    const root = await getMonorepoRoot();
    return {
        root,
        version: monorepoVersion,
        packages: await getAllPackages(root),
    };
}
