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
    return prettier.format(fileContents, {
        filepath,
        parser: prettierParser,
    });
}
