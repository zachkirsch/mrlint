import { PackageType, Result, Rule, RuleType } from "@mrlint/commons";
import { writePackageFile } from "../utils/writePackageFile";

export const DeclarationsRule: Rule.PackageRule = {
    ruleId: "declarations",
    type: RuleType.PACKAGE,
    targetedPackages: [PackageType.REACT_LIBRARY, PackageType.NEXT_APP],
    run: runRule,
};

const DECLARATIONS_D_TS = `// CSS modules
type CSSModuleClasses = Readonly<Record<string, string>>;

declare module "*.module.scss" {
    const classes: CSSModuleClasses;
    export default classes;
}

// CSS
declare module "*.css" {}
declare module "*.scss" {}

// images
declare module "*.png" {
    const src: string;
    export default src;
}
declare module "*.jpg" {
    const src: string;
    export default src;
}
declare module "*.jpeg" {
    const src: string;
    export default src;
}
declare module "*.gif" {
    const src: string;
    export default src;
}
declare module "*.svg" {
    const src: string;
    export default src;
}
declare module "*.ico" {
    const src: string;
    export default src;
}
`;

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    return writePackageFile({
        fileSystem: fileSystems.getFileSystemForPackage(packageToLint),
        filename: "src/declarations.d.ts",
        contents: DECLARATIONS_D_TS,
        logger,
    });
}
