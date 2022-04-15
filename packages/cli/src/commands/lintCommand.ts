import { MonorepoLoggers } from "@fernapi/mrlint-commons";
import { lintMonorepo } from "@fernapi/mrlint-lint";
import { parseMonorepo } from "@fernapi/mrlint-parser";
import rules from "@fernapi/mrlint-rules";

export async function lintCommand({
    loggers,
    shouldFix,
    monorepoVersion,
}: {
    loggers: MonorepoLoggers;
    shouldFix: boolean;
    monorepoVersion: string | undefined;
}): Promise<void> {
    const monorepo = await parseMonorepo({ monorepoVersion });

    const result = await lintMonorepo({
        monorepo,
        rules: rules.rules,
        shouldFix,
        loggers,
    });

    if (!result.isSuccess()) {
        process.exit(1);
    }
}
