import tseslint from 'typescript-eslint';

/**
 * Nền TypeScript cho package (không có Next/Expo). Apps tự mang config riêng
 * (eslint-config-next, ...) rồi thêm `app()` từ boundaries.mjs.
 */
export const base = [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**'] },
  ...tseslint.configs.recommended,
];
