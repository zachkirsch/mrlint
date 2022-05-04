export function getRuleConfig<T>(ruleConfig: unknown | undefined): T | undefined {
    return ruleConfig as T;
}
