export enum Executable {
    TSC,
    JEST,
    ESLINT,
    STYLELINT,
    PRETTIER,
    DEPCHECK,
    ENV_CMD,
    AWS_CDK,
    REACT_SCRIPTS,
    RUN_P,
    RUN_S,
}

export const EXECUTABLES: Record<Executable, string> = {
    [Executable.TSC]: "tsc",
    [Executable.JEST]: "jest",
    [Executable.ESLINT]: "eslint",
    [Executable.STYLELINT]: "stylelint",
    [Executable.PRETTIER]: "prettier",
    [Executable.DEPCHECK]: "depcheck",
    [Executable.ENV_CMD]: "env-cmd",
    [Executable.AWS_CDK]: "cdk",
    [Executable.REACT_SCRIPTS]: "react-scripts",
    [Executable.RUN_P]: "run-p",
    [Executable.RUN_S]: "run-s",
};

const DEPENDENCIES: Record<Executable, string> = {
    [Executable.TSC]: "typescript",
    [Executable.JEST]: "jest",
    [Executable.ESLINT]: "eslint",
    [Executable.STYLELINT]: "stylelint",
    [Executable.PRETTIER]: "prettier",
    [Executable.DEPCHECK]: "depcheck",
    [Executable.ENV_CMD]: "env-cmd",
    [Executable.AWS_CDK]: "aws-cdk",
    [Executable.REACT_SCRIPTS]: "react-scripts",
    [Executable.RUN_P]: "npm-run-all",
    [Executable.RUN_S]: "npm-run-all",
};

export interface RequiredDependency {
    executable: Executable;
    dependency: string;
}

export class Executables {
    private accessed = new Set<Executable>();

    public get(executable: Executable): string {
        this.accessed.add(executable);
        return EXECUTABLES[executable];
    }

    public getRequiredDependencies(): RequiredDependency[] {
        return [...this.accessed].map((executable) => ({
            dependency: DEPENDENCIES[executable],
            executable,
        }));
    }
}
