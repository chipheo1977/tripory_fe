import type { Linter } from 'eslint';

type UiRole = 'components' | 'tokens';

export declare const contextPackage: () => Linter.Config[];
export declare const kernelPackage: () => Linter.Config[];
export declare const httpPackage: () => Linter.Config[];
export declare const uiPackage: (options?: { role?: UiRole }) => Linter.Config[];
export declare const app: () => Linter.Config[];
