import { LogLevel } from "@mrlint/commons";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { addWorkspaceCommand } from "./commands/addWorkspaceCommand";
import { lintCommand } from "./commands/lintCommand";
import { listCommand } from "./commands/listCommand";
import { versionCommand } from "./commands/versionCommand";
import { ConsoleMonorepoLogger } from "./ConsoleMonorepoLogger";

type CommandLineLogLevel = "debug" | "info" | "warn" | "error";
const DEFAULT_COMMAND_LINE_LOG_LEVEL: CommandLineLogLevel = "info";

const LOG_LEVELS: Record<CommandLineLogLevel, true> = {
    debug: true,
    info: true,
    warn: true,
    error: true,
};

yargs(hideBin(process.argv))
    .scriptName("mrlint")
    .strict()
    .option("log-level", {
        default: DEFAULT_COMMAND_LINE_LOG_LEVEL,
        choices: keys(LOG_LEVELS),
    })
    .command(
        "lint",
        "Lint the monorepo",
        (argv) =>
            argv.option("fix", {
                boolean: true,
                default: false,
            }),
        async (argv) => {
            await lintCommand({
                loggers: new ConsoleMonorepoLogger(convertLogLevel(argv.logLevel)),
                shouldFix: argv.fix,
            });
        }
    )
    .command(
        "version <new_version>",
        "Apply the provided version to all public package in the monorepo",
        (argv) =>
            argv.positional("new_version", {
                type: "string",
                demandOption: true,
            }),
        async (argv) => {
            await versionCommand({
                newVersion: argv.new_version,
            });
        }
    )
    .command("list", "List the packages in the monorepo", listCommand)
    .command(
        "add-workspace",
        "Create a new workspace",
        () => {
            /* no-op */
        },
        async (argv) => {
            await addWorkspaceCommand({ loggers: new ConsoleMonorepoLogger(convertLogLevel(argv.logLevel)) });
        }
    )
    .demandCommand()
    .showHelpOnFail(true)
    .parse();

function convertLogLevel(level: CommandLineLogLevel): LogLevel {
    switch (level) {
        case "debug":
            return LogLevel.DEBUG;
        case "info":
            return LogLevel.INFO;
        case "warn":
            return LogLevel.WARN;
        case "error":
            return LogLevel.ERROR;
    }
}

function keys<T>(obj: T): (keyof T & string)[] {
    return Object.keys(obj) as (keyof T & string)[];
}
