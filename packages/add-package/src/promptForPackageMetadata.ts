import { Monorepo, PackageType } from "@mrlint/commons";
import inquirer from "inquirer";
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt";
import path from "path";
import { doesFilepathExist } from "./doesFilepathExist";

const VALID_PACKAGE_NAME = /[a-z-]+/;

const LOCATION_KEY = "location";
type LocationKey = typeof LOCATION_KEY;

const NAME_KEY = "name";
type NameKey = typeof NAME_KEY;

const TYPE_KEY = "type";
type TypeKey = typeof TYPE_KEY;

const PRIVATE_KEY = "isPrivate";
type PrivateKey = typeof PRIVATE_KEY;

export type PackageMetadata = Record<LocationKey, string> &
    Record<NameKey, string> &
    Record<TypeKey, PackageType> &
    Record<PrivateKey, boolean>;

export async function promptForPackageMetadata(monorepo: Monorepo): Promise<PackageMetadata> {
    inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection);

    const packagesDirectory = path.join(monorepo.root.fullPath, "packages");

    const answers = await inquirer.prompt([
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
            name: NAME_KEY,
            message: "Package name",
            validate: async (item: string, answers) => {
                if (!VALID_PACKAGE_NAME.test(item)) {
                    return false;
                }

                const packagePath = path.join(answers[LOCATION_KEY], item);
                if (await doesFilepathExist(packagePath)) {
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
