import { Monorepo, PackageType } from "@mrlint/commons";
import inquirer from "inquirer";
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt";
import path from "path";
import { doesFilepathExist } from "./doesFilepathExist";

const VALID_PACKAGE_NAME = /[a-z-]+/;

const LOCATION_KEY = "location";
type LocationKey = typeof LOCATION_KEY;

const DIRECTORY_NAME_KEY = "directoryName";
type DirectoryNameKey = typeof DIRECTORY_NAME_KEY;

const PACKAGE_NAME_KEY = "packageName";
type PackageNameKey = typeof PACKAGE_NAME_KEY;

const TYPE_KEY = "type";
type TypeKey = typeof TYPE_KEY;

const PRIVATE_KEY = "isPrivate";
type PrivateKey = typeof PRIVATE_KEY;

export type PackageMetadata = Record<LocationKey, string> &
    Record<DirectoryNameKey, string> &
    Record<PackageNameKey, string> &
    Record<TypeKey, PackageType> &
    Record<PrivateKey, boolean>;

export async function promptForPackageMetadata(monorepo: Monorepo): Promise<PackageMetadata> {
    inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection);

    const packagesDirectory = path.join(monorepo.root.fullPath, "packages");

    const answers = await inquirer.prompt<PackageMetadata>([
        {
            type: "file-tree-selection",
            name: LOCATION_KEY,
            message: "Package location",
            root: monorepo.root.fullPath,
            default: packagesDirectory,
            onlyShowDir: true,
            transformer: (item: string) => (path.isAbsolute(item) ? path.relative(monorepo.root.fullPath, item) : item),
            validate: async (item: string) => {
                // at the root level, only allow packages/
                if (path.normalize(path.dirname(item)) === path.normalize(monorepo.root.fullPath)) {
                    return path.normalize(item) === path.normalize(packagesDirectory);
                }

                // otherwise, allow any folder that doesn't have a package.json
                const hasPackageJson = await doesFilepathExist(path.join(item, "package.json"));
                return !hasPackageJson;
            },
        },
        {
            type: "input",
            name: DIRECTORY_NAME_KEY,
            message: "Directory name",
            validate: async (item: string, answers) => {
                if (answers != null) {
                    const packagePath = path.join(answers[LOCATION_KEY], item);
                    if (await doesFilepathExist(packagePath)) {
                        return false;
                    }
                }

                return true;
            },
        },
        {
            type: "input",
            name: PACKAGE_NAME_KEY,
            message: "Package name",
            default: (answers: PackageMetadata | undefined) => {
                if (answers == null) {
                    return undefined;
                }
                const directoryName = answers[DIRECTORY_NAME_KEY];
                return `${monorepo.root.config.defaultScopeWithAtSign}/${directoryName}`;
            },
            validate: async (item: string) => {
                if (!VALID_PACKAGE_NAME.test(item)) {
                    return false;
                }

                if (monorepo.packages.some((p) => p.name === item)) {
                    return false;
                }

                return true;
            },
        },
        {
            type: "list",
            name: TYPE_KEY,
            message: "Package type",
            choices: Object.values(PackageType),
        },
        {
            type: "confirm",
            name: PRIVATE_KEY,
            message: "Private?",
        },
    ]);

    return answers;
}
