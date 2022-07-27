import { formatFileContents, Monorepo, Package } from "@mrlint/commons";
import { parseMonorepo } from "@mrlint/parser";
import { readFile, writeFile } from "fs/promises";
import { IPackageJson } from "package-json-type";
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
    const packageJsonPath = path.join(monorepo.root.fullPath, p.relativePath, "package.json");
    const packageJsonStr = (await readFile(packageJsonPath)).toString();
    const packageJson = JSON.parse(packageJsonStr) as IPackageJson;

    if (packageJson.private === true) {
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
