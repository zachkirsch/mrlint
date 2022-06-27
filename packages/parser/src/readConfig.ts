import { readFile } from "fs/promises";
import yaml from "js-yaml";
import path from "path";

export async function readConfig<T>(
    filepath: string,
    validate: (contents: unknown) => T | Promise<T>
): Promise<T | undefined> {
    let contents: Buffer;
    try {
        contents = await readFile(filepath);
    } catch (e) {
        return undefined;
    }

    const parsed = await parse({ filepath, contents: contents.toString() });
    return validate(parsed);
}

async function parse({ filepath, contents }: { filepath: string; contents: string }): Promise<unknown> {
    const extension = path.extname(filepath);
    switch (extension) {
        case ".json":
            return JSON.parse(contents);
        case ".yml":
            return yaml.load(contents);
        default:
            throw new Error(`Invalid config file extension: ${extension}`);
    }
}
