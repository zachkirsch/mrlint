import { stat } from "fs/promises";

export async function doesFilepathExist(filepath: string): Promise<boolean> {
    try {
        await stat(filepath);
        return true;
    } catch {
        return false;
    }
}
