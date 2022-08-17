import { convertRemoteToRepository } from "../getRepository";

describe("convertRemoteToRepository", () => {
    it("openapi repo", () => {
        const remote = "git@github.com:fern-api/fern-openapi.git";
        expect(convertRemoteToRepository(remote)).toBe("https://github.com/fern-api/fern-openapi.git");
    });
});
