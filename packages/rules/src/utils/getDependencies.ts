export function getDependencies(dependencies: Record<string, string> | undefined): string[] {
    if (dependencies == null) {
        return [];
    }
    return Object.keys(dependencies);
}
