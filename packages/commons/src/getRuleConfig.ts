export function getRuleConfig<T>(pluginConfig: unknown | undefined): T | undefined {
    return pluginConfig as T;
}
