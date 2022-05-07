import { Logger, LogLevel, MonorepoLoggers, Package, Rule } from "@fern-api/mrlint-commons";
import { ConsoleMessage, ConsoleMessageMetadata } from "./ConsoleMessage";

export class ConsoleMonorepoLogger implements MonorepoLoggers {
    constructor(private readonly maxLevel: LogLevel) {}

    public getLogger = (): Logger => {
        return this.getLoggerWithDefaultMetadata();
    };

    public getLoggerForPackage = (p: Package): Logger => {
        return this.getLoggerWithDefaultMetadata({
            package: p,
        });
    };

    public getLoggerForRule = (args: { rule: Rule; package: Package | undefined }): Logger => {
        return this.getLoggerWithDefaultMetadata({
            package: args.package,
            rule: args.rule,
        });
    };

    private getLoggerWithDefaultMetadata(defaultMetadata: Partial<ConsoleMessageMetadata> = {}): Logger {
        return {
            error: (args) => {
                const message = new ConsoleMessage({
                    ...defaultMetadata,
                    title: typeof args === "string" ? args : args.message,
                    error: typeof args !== "string" ? args.error : undefined,
                    additionalContent: typeof args !== "string" ? args.additionalContent : undefined,
                    level: LogLevel.ERROR,
                    maxLevel: this.maxLevel,
                });
                message.print();
            },
            warn: (args) => {
                const message = new ConsoleMessage({
                    ...defaultMetadata,
                    title: typeof args === "string" ? args : args.message,
                    additionalContent: typeof args !== "string" ? args.additionalContent : undefined,
                    level: LogLevel.WARN,
                    maxLevel: this.maxLevel,
                });
                message.print();
            },
            info: (args) => {
                const message = new ConsoleMessage({
                    ...defaultMetadata,
                    title: typeof args === "string" ? args : args.message,
                    additionalContent: typeof args !== "string" ? args.additionalContent : undefined,
                    level: LogLevel.INFO,
                    maxLevel: this.maxLevel,
                });
                message.print();
            },
            debug: (args) => {
                const message = new ConsoleMessage({
                    ...defaultMetadata,
                    title: typeof args === "string" ? args : args.message,
                    additionalContent: typeof args !== "string" ? args.additionalContent : undefined,
                    level: LogLevel.DEBUG,
                    maxLevel: this.maxLevel,
                });
                message.print();
            },
            log: (args, level = LogLevel.INFO) => {
                const message = new ConsoleMessage({
                    ...defaultMetadata,
                    title: typeof args === "string" ? args : args.message,
                    additionalContent: typeof args !== "string" ? args.additionalContent : undefined,
                    level,
                    maxLevel: this.maxLevel,
                });
                message.print();
            },
            newline: () => {
                console.log();
            },
        };
    }
}
