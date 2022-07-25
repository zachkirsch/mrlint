// copied from https://github.com/prettier/prettier/blob/main/src/config/resolve-config.js

import micromatch from "micromatch";
import path from "path";
import { Config, Options } from "prettier";

export function applyPrettierOverrides({
    config,
    configPath,
    filepath,
}: {
    config: Config;
    configPath: string;
    filepath: string;
}): Options {
    const { overrides, ...options } = config;
    let newOptions = options;

    if (overrides != null) {
        const relativeFilePath = path.relative(path.dirname(configPath), filepath);
        for (const override of overrides) {
            if (
                pathMatchesGlobs({
                    filePath: relativeFilePath,
                    patterns: override.files,
                    excludedPatterns: override.excludeFiles,
                })
            ) {
                newOptions = {
                    ...newOptions,
                    ...override.options,
                };
            }
        }
    }

    return newOptions;
}

function pathMatchesGlobs({
    filePath,
    patterns,
    excludedPatterns,
}: {
    filePath: string;
    patterns: string | string[];
    excludedPatterns: string | string[] | undefined;
}) {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    // micromatch always matches against basename when the option is enabled
    // use only patterns without slashes with it to match minimatch behavior
    const [withSlashes, withoutSlashes] = partition(patternList, (pattern) => pattern.includes("/"));

    return (
        micromatch.isMatch(filePath, withoutSlashes, {
            ignore: excludedPatterns,
            basename: true,
            dot: true,
        }) ||
        micromatch.isMatch(filePath, withSlashes, {
            ignore: excludedPatterns,
            basename: false,
            dot: true,
        })
    );
}

function partition<T>(array: readonly T[], predicate: (item: T) => boolean) {
    const result: [T[], T[]] = [[], []];

    for (const value of array) {
        result[predicate(value) ? 0 : 1].push(value);
    }

    return result;
}
