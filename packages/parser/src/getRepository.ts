import execa from "execa";

export async function getRepository(): Promise<string> {
    const { stdout: remote } = await execa("git", ["config", "--get", "remote.origin.url"]);
    return convertRemoteToRepository(remote);
}

// exported for testing
const REPOSITORY_REGEX = /git@github.com:(.*)\.git/;
export function convertRemoteToRepository(remote: string): string {
    const match = remote.match(REPOSITORY_REGEX);
    if (match == null) {
        throw new Error("Could not parse remote: " + remote);
    }
    return `github:${match[1]}`;
}
