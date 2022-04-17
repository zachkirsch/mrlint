export class Result {
    public static success(): Result {
        return new Result(true);
    }

    public static failure(): Result {
        return new Result(false);
    }

    private constructor(private _isSuccess: boolean) {}

    public accumulate(other: Result): void {
        if (this._isSuccess) {
            this._isSuccess = other.isSuccess();
        }
    }

    public fail(): void {
        this._isSuccess = false;
    }

    public isSuccess(): boolean {
        return this._isSuccess;
    }
}
