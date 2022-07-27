import { MonorepoLoggers } from "@mrlint/commons";
import { lintMonorepo } from "@mrlint/lint";
import { parseMonorepo } from "@mrlint/parser";

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
        shouldFix,
        loggers,
    });

    if (!result.isSuccess()) {
        process.exit(1);
    }
}
