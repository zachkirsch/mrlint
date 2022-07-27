import { FileSystem } from "@mrlint/virtual-file-system";
import { IPackageJson } from "package-json-type";
import { Logger } from "./logger/Logger";

export interface PackageJsonWithName extends IPackageJson {
    name: string;
}

export async function getPackageJson(
    fileSystemForPackage: FileSystem,
    logger?: Logger
): Promise<PackageJsonWithName | undefined> {
    const packageJsonStr = await fileSystemForPackage.readFile("package.json");

    if (packageJsonStr == null) {
        logger?.error("package.json does not exist");
        return undefined;
    }

    const { name, ...rest } = JSON.parse(packageJsonStr) as IPackageJson;
    if (name == null) {
        logger?.error('package.json is missing "name"');
        return undefined;
    }

    return { name, ...rest };
}
