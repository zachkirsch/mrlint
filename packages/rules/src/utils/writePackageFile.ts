import { Logger, Result } from "@fern-api/mrlint-commons";
import { FileSystem } from "@fern-api/mrlint-virtual-file-system";

export declare namespace writePackageFile {
    export interface Args {
        fileSystem: FileSystem;
        filename: string;
        contents: string;
        logger: Logger;
    }
}

export async function writePackageFile({
    fileSystem,
    filename,
    contents,
    logger,
}: writePackageFile.Args): Promise<Result> {
    try {
        await fileSystem.writeFile(filename, contents);
        return Result.success();
    } catch (error) {
        logger.error({
            message: `Failed to write ${filename}`,
            error,
        });
        return Result.failure();
    }
}
