import prettier, { BuiltInParserName } from "prettier";

export async function formatFileContents({
    fileContents,
    filepath,
    prettierParser,
}: {
    fileContents: string;
    filepath: string;
    prettierParser: BuiltInParserName | undefined;
}): Promise<string> {
    const prettierOptions = await prettier.resolveConfig(filepath, {
        useCache: false,
    });
    if (prettierOptions == null) {
        throw new Error("Could not locate prettier config.");
    }

    return prettier.format(fileContents, {
        ...prettierOptions,
        filepath,
        parser: prettierParser,
    });
}
