import findUp from "find-up";
import path from "path";
import prettier, { BuiltInParserName, Config } from "prettier";
import { PRETTIER_RC_FILENAME } from "../constants";
import { applyPrettierOverrides } from "./applyPrettierOverrides";

export async function formatFileContents({
    fileContents,
    filepath,
    prettierParser,
}: {
    fileContents: string;
    filepath: string;
    prettierParser: BuiltInParserName | undefined;
}): Promise<string> {
    const prettierConfigFilePath = await findUp(PRETTIER_RC_FILENAME, {
        cwd: path.dirname(filepath),
    });
    if (prettierConfigFilePath == null) {
        throw new Error("Could not locate prettier config.");
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prettierConfig: Config = require(/* webpackIgnore: true */ prettierConfigFilePath);

    const prettierOptions = applyPrettierOverrides({
        config: prettierConfig,
        configPath: prettierConfigFilePath,
        filepath,
    });

    return prettier.format(fileContents, {
        ...prettierOptions,
        filepath,
        parser: prettierParser,
    });
}
