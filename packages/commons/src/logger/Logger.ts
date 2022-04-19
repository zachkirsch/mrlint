export type Logger = {
    debug: Logger.LogFunction;
    info: Logger.LogFunction;
    warn: Logger.LogFunction;
    error: Logger.LogFunction;
    log: (args: Logger.LogFunctionArgs, level?: LogLevel) => void;
    newline: () => void;
};

export declare namespace Logger {
    export type LogFunction = (args: LogFunctionArgs) => void;

    export type LogFunctionArgs =
        | string
        | {
              message: string;
              additionalContent?: string | readonly string[];
              error?: unknown;
          };
}

export enum LogLevel {
    ERROR,
    WARN,
    INFO,
    DEBUG,
}
