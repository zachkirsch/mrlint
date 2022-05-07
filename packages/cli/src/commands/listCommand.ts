import { parseMonorepo } from "@fern-api/mrlint-parser";

export async function listCommand(): Promise<void> {
    const monorepo = await parseMonorepo();
    console.group("Monorepo:", monorepo.root.fullPath);
    for (const p of monorepo.packages) {
        console.log(p.relativePath);
    }
    console.groupEnd();
}
