import { Package } from "@fern-api/mrlint-commons";

export function keyPackagesByNpmName(allPackages: readonly Package[]): Record<string, Package> {
    return allPackages.reduce<Record<string, Package>>((acc, p) => {
        if (p.packageJson?.name != null) {
            acc[p.packageJson.name] = p;
        }
        return acc;
    }, {});
}
