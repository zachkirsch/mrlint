import { PackageType, Result, Rule, RuleType } from "@fernapi/mrlint-commons";
import { FileSystem } from "@fernapi/mrlint-virtual-file-system";
import produce from "immer";

interface DepcheckConfig {
    ignores?: string[];
    "ignore-patterns"?: string[];
}

export const DepcheckRule: Rule.PackageRule = {
    ruleId: "depcheck",
    type: RuleType.PACKAGE,
    targetedPackages: [
        PackageType.REACT_APP,
        PackageType.REACT_LIBRARY,
        PackageType.TYPESCRIPT_LIBRARY,
        PackageType.TYPESCRIPT_CLI,
    ],
    run: runRule,
};

const FILENAME = ".depcheckrc.json";

async function runRule({ fileSystems, packageToLint, logger }: Rule.PackageRuleRunnerArgs): Promise<Result> {
    let depcheckRc: DepcheckConfig = {
        "ignore-patterns": ["lib"],
    };

    if (packageToLint.config.type === PackageType.REACT_APP) {
        depcheckRc = produce(depcheckRc, (draft) => {
            if (draft.ignores == null) {
                draft.ignores = [];
            }
            draft.ignores.push("sass");
        });
    }

    const fileSystemForPackage = fileSystems.getFileSystemForPackage(packageToLint);
    try {
        depcheckRc = await mergeWithExistingIgnores({ fileSystemForPackage, depcheckRc });
        await fileSystemForPackage.writeFile(FILENAME, JSON.stringify(depcheckRc));
        return Result.success();
    } catch (error) {
        logger.error({
            message: `Failed to write ${FILENAME}`,
            error,
        });
        return Result.failure();
    }
}
async function mergeWithExistingIgnores({
    fileSystemForPackage,
    depcheckRc,
}: {
    fileSystemForPackage: FileSystem;
    depcheckRc: DepcheckConfig;
}): Promise<DepcheckConfig> {
    return produce(depcheckRc, async (draft) => {
        const existingStr = await fileSystemForPackage.readFile(FILENAME);
        const existing = existingStr != null ? (JSON.parse(existingStr) as DepcheckConfig) : undefined;
        if (draft.ignores == null) {
            draft.ignores = existing?.ignores;
        } else {
            if (existing?.ignores != null) {
                for (const existingIgnore of existing.ignores) {
                    if (!draft.ignores.includes(existingIgnore)) {
                        draft.ignores.push(existingIgnore);
                    }
                }
            }
        }
        if (draft["ignore-patterns"] == null) {
            draft["ignore-patterns"] = existing?.["ignore-patterns"];
        } else {
            if (existing?.["ignore-patterns"] != null) {
                for (const existingIgnorePattern of existing["ignore-patterns"]) {
                    if (!draft["ignore-patterns"].includes(existingIgnorePattern)) {
                        draft["ignore-patterns"].push(existingIgnorePattern);
                    }
                }
            }
        }
    });
}
