import { FileSystem } from "@mrlint/virtual-file-system";
import { Logger } from "./logger/Logger";
import { Result } from "./Result";
import { LintablePackage, Monorepo, Package, PackageType } from "./types";

export type Rule = Rule.MonorepoRule | Rule.PackageRule;

export enum RuleType {
    MONOREPO = "MONOREPO",
    PACKAGE = "PACKAGE",
}

export declare namespace Rule {
    /**
     * a rule that applies to the entire monorepo.
     * it is run once.
     */
    export interface MonorepoRule extends BaseRule {
        type: RuleType.MONOREPO;
        run: Runner<MonorepoRuleRunnerArgs>;
    }

    export interface MonorepoRuleRunnerArgs {
        monorepo: Monorepo;
        fileSystems: FileSystems;
        logger: Logger;
        getLoggerForPackage: (p: Package) => Logger;
    }

    /**
     * a rule that applies to a package.
     * it is run once per package.
     */
    export interface PackageRule<T extends PackageType = PackageType> extends BaseRule {
        type: RuleType.PACKAGE;
        targetedPackages: T[];
        run: Runner<PackageRuleRunnerArgs<T>>;
    }

    export interface PackageRuleRunnerArgs<PackageTypes extends PackageType = PackageType> {
        packageToLint: LintablePackage<PackageTypes>;
        allPackages: readonly Package[];
        relativePathToRoot: string;
        relativePathToSharedConfigs: string;
        relativePathToScripts: string;
        repository: string;
        fileSystems: FileSystems;
        logger: Logger;
        addDevDependency: (dependency: string, version?: string) => void;
        ruleConfig: unknown | undefined;
    }

    interface Issue {
        severity: "warning" | "error";
        summary: string;
    }

    export interface BaseRule {
        ruleId: string;
        docs?: string;
    }

    export type Runner<Args> = (args: Args) => Result | Promise<Result>;

    export interface FileSystems {
        getFileSystemForMonorepo: () => FileSystem;
        getFileSystemForPackage: (package: Package) => FileSystem;
    }
}
