import { MonorepoLoggers } from "@fernapi/mrlint-commons";
import { lintMonorepo } from "@fernapi/mrlint-lint";
import { parseMonorepo } from "@fernapi/mrlint-parser";
import rules from "@fernapi/mrlint-rules";

export async function lintCommand({
    loggers,
    shouldFix,
}: {
    loggers: MonorepoLoggers;
    shouldFix: boolean;
}): Promise<void> {
    const monorepo = await parseMonorepo();

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
