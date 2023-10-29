import execa from "execa";

export async function getRepository(): Promise<string> {
    const { stdout: remote } = await execa("git", ["config", "--get", "remote.origin.url"]);
    return convertRemoteToRepository(remote);
}

// exported for testing
export function convertRemoteToRepository(remote: string): string {
    const remotePointingToGithub = remote.replace("git@github.com:", "https://github.com/");
    if (remotePointingToGithub.endsWith(".git")) {
        return remotePointingToGithub;
    }
    return `${remotePointingToGithub}.git`;
}
