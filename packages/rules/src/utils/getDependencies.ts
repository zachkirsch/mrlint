import { IPackageJson } from "package-json-type";

export interface Dependency {
    name: string;
    version: string;
}

export function getDependencies(packageJson: IPackageJson): Dependency[] {
    const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    };
    return Object.entries(dependencies).map(([name, version]) => ({ name, version }));
}
