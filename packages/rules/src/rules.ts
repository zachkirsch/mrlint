import { CliRule } from "./rules/cli";
import { DepcheckRule } from "./rules/depcheck";
import { DuplicateDependenciesRule } from "./rules/duplicate-dependencies";
import { EnvCmdRule } from "./rules/env-cmd";
import { JestRule } from "./rules/jest";
import { PackageJsonRule } from "./rules/package-json";
import { PrettierRule } from "./rules/prettier";
import { StyleLintRule } from "./rules/stylelint";
import { TsConfigRule } from "./rules/ts-config";
import { ViteRule } from "./rules/vite";

export const rules = [
    PackageJsonRule,
    TsConfigRule,
    DepcheckRule,
    JestRule,
    PrettierRule,
    StyleLintRule,
    CliRule,
    EnvCmdRule,
    DuplicateDependenciesRule,
    ViteRule,
];
