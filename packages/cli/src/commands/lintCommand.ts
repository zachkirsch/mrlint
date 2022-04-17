import { MonorepoLoggers } from "@fern-api/mrlint-commons";
import { lintMonorepo } from "@fern-api/mrlint-lint";
import { parseMonorepo } from "@fern-api/mrlint-parser";
import rules from "@fern-api/mrlint-rules";

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
