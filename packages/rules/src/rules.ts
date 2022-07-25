import { Rule } from "@fern-api/mrlint-commons";
import { CliRule } from "./rules/cli";
import { DeclarationsRule } from "./rules/declarations";
import { DepcheckRule } from "./rules/depcheck";
import { DuplicateDependenciesRule } from "./rules/duplicate-dependencies";
import { JestRule } from "./rules/jest";
import { PackageJsonRule } from "./rules/package-json";
import { PrettierRule } from "./rules/prettier";
import { StyleLintRule } from "./rules/stylelint";
import { TsConfigRule } from "./rules/ts-config";

export type Rules = Rule[];

export const rules: Rules = [
    PackageJsonRule,
    TsConfigRule,
    DepcheckRule,
    DeclarationsRule,
    JestRule,
    PrettierRule,
    StyleLintRule,
    CliRule,
    DuplicateDependenciesRule,
];
