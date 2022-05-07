import { formatFileContents, Monorepo, Package } from "@fern-api/mrlint-commons";
import { parseMonorepo } from "@fern-api/mrlint-parser";
import { writeFile } from "fs/promises";
import path from "path";

export async function versionCommand({ newVersion }: { newVersion: string }): Promise<void> {
    const monorepo = await parseMonorepo();
    await Promise.all(monorepo.packages.map((p) => addVersionToPackage({ monorepo, p, newVersion })));
}

async function addVersionToPackage({
    monorepo,
    p,
    newVersion,
}: {
    monorepo: Monorepo;
    p: Package;
    newVersion: string;
}): Promise<void> {
    const { packageJson } = p;
    if (packageJson == null || packageJson.private === true) {
        return;
    }

    const { name, version, ...rest } = packageJson;
    const newPackageJson = {
        name,
        version: newVersion,
        ...rest,
    };

    const fullPath = path.join(monorepo.root.fullPath, p.relativePath, "package.json");
    const formatted = await formatFileContents({
        filepath: fullPath,
        fileContents: JSON.stringify(newPackageJson),
        prettierParser: undefined,
    });
    await writeFile(fullPath, formatted);
}
