import { LintablePackage, PackageType } from "@mrlint/commons";

export function canPackageContainCss(p: LintablePackage): boolean {
    if (p.config.type == null) {
        return false;
    }
    switch (p.config.type) {
        case PackageType.REACT_APP:
        case PackageType.REACT_LIBRARY:
            return true;
        case PackageType.TYPESCRIPT_CLI:
        case PackageType.TYPESCRIPT_LIBRARY:
        case PackageType.CUSTOM:
            return false;
    }
}
