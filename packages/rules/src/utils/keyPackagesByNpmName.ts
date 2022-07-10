import { getPackageJson, Package } from "@fern-api/mrlint-commons";
import { FileSystem } from "@fern-api/mrlint-virtual-file-system";

export async function keyPackagesByNpmName({
    allPackages,
    getFileSystemForPackage,
}: {
    allPackages: readonly Package[];
    getFileSystemForPackage: (p: Package) => FileSystem;
}): Promise<Record<string, Package>> {
    const packagesByNpmName: Record<string, Package> = {};
    await Promise.all(
        allPackages.map(async (p) => {
            const packageJson = await getPackageJson(getFileSystemForPackage(p));
            if (packageJson != null) {
                packagesByNpmName[packageJson.name] = p;
            }
        })
    );
    return packagesByNpmName;
}
