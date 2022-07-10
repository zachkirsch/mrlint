import { MonorepoLoggers } from "@fern-api/mrlint-commons";
import { lintMonorepo } from "@fern-api/mrlint-lint";
import { parseMonorepo } from "@fern-api/mrlint-parser";

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
