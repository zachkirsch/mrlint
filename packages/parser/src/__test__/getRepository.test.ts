import { convertRemoteToRepository } from "../getRepository";

describe("convertRemoteToRepository", () => {
    it("actual remote", () => {
        const remote = "git@github.com:fern-api/fern-openapi.git";
        expect(convertRemoteToRepository(remote)).toBe("github:fern-api/fern-openapi");
    });

    it("malformed remote", () => {
        expect(() => convertRemoteToRepository("")).toThrow();
    });
});
