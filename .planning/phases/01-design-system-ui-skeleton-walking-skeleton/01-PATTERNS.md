# Phase 1: Design System, UI Skeleton & Walking Skeleton - Pattern Map

**Mapped:** 2026-10-11
**Files analyzed:** 104 file mới/sửa/xóa, gom thành 38 nhóm (component atom/molecule và test của chúng đếm theo nhóm)
**Analogs found:** 24 / 38 nhóm. 14 nhóm còn lại (component React, CSS token, route convention) không có analog trong repo, phải theo RESEARCH.md và source shadcn `base-nova`

Repo hiện chỉ có khung: `packages/config` (preset + self-test), ba package rỗng (`export {}`) và scaffold create-next-app trong `apps/web`. Analog tốt nằm ở **phần scaffolding và cưỡng chế** (package.json, eslint/tsconfig/vitest config, preset, self-test, turbo). **Chưa có component React, CSS token hay test DOM nào.** Với các file đó, planner dùng RESEARCH.md (Pattern 2–6, Code Examples) và UI-SPEC.

Quy ước style khác nhau theo vùng, giữ nguyên khi thêm file:
- `packages/*`: nháy đơn, có `;`, comment tiếng Việt giải thích *lý do* (xem `boundaries.mjs`, `preset.mjs`).
- `apps/web`: nháy kép, có `;` (style của create-next-app, xem `layout.tsx`, `eslint.config.mjs`).

## File Classification

| File mới/sửa | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `package.json` (gốc) — sửa `packageManager` | config | — | chính nó | exact |
| `pnpm-workspace.yaml` — thêm catalog, giữ `allowBuilds` | config | — | chính nó | exact |
| `pnpm-lock.yaml` — sinh lại bằng pnpm 10.34.6 | config | — | — | (sinh bởi tool) |
| `turbo.json` — `build.dependsOn` thêm `transit` | config | batch | chính nó (task `lint`/`typecheck`/`test`) | exact |
| `packages/config/eslint/boundaries.mjs` — thêm `uiPackage()`, mở rộng `zone()`/`rulesFor()` | config (lint preset) | transform | chính nó (`contextPackage`, `kernelPackage`, `httpPackage`) | exact |
| `packages/config/test/boundaries.test.ts` — thêm ca bad/ok | test | batch | chính nó | exact |
| `packages/config/vitest/ui-preset.mjs` (mới) | config | — | `packages/config/vitest/preset.mjs` | exact |
| `packages/config/vitest/ui-preset.d.mts` (mới) | config (types) | — | `packages/config/vitest/preset.d.mts` | exact |
| `packages/config/package.json` — export `./vitest/ui` | config | — | chính nó | exact |
| `packages/config/tsconfig.json` — include `.d.mts` mới | config | — | chính nó | exact |
| `ai-memories/tripory-fe--ddd-architecture.md` — mục 3/4/5/8/9 | docs | — | chính nó (bảng preset mục 8, bảng allowlist mục 5) | exact |
| `packages/design-tokens/package.json` | config | — | `packages/shared-kernel/package.json` | role-match |
| `packages/design-tokens/eslint.config.mjs` | config | — | `packages/shared-kernel/eslint.config.mjs` | exact |
| `packages/design-tokens/tsconfig.json` | config | — | `packages/api-client/tsconfig.json` | exact |
| `packages/design-tokens/vitest.config.ts` | config | — | `packages/api-client/vitest.config.ts` | exact |
| `packages/design-tokens/src/{primitives,semantic,components,dark,theme,index}.css` | style tokens | transform (build-time) | `apps/web/src/app/globals.css` (chỉ mẫu `@theme inline`) | partial |
| `packages/design-tokens/src/index.ts` (hằng snap point) | utility | — | `packages/shared-kernel/src/index.ts` (entry rỗng) | partial |
| `packages/design-tokens/src/tokens.test.ts` | test | file-I/O + transform | `packages/config/test/boundaries.test.ts` (đọc file bằng `node:fs`, `repoRoot`) | partial |
| `packages/ui-web/package.json` | config | — | `packages/itinerary/package.json` | role-match |
| `packages/ui-web/eslint.config.mjs` | config | — | `packages/api-client/eslint.config.mjs` | exact |
| `packages/ui-web/tsconfig.json` (+ `jsx`) | config | — | `packages/api-client/tsconfig.json` | role-match |
| `packages/ui-web/vitest.config.ts` | config | — | `packages/config/vitest.config.ts` (`mergeConfig`) | exact |
| `packages/ui-web/turbo.json` (khuyến nghị, cho token-guard quét `apps/web`) | config | — | `packages/config/turbo.json` | exact |
| `packages/ui-web/components.json`, `apps/web/components.json` | config | — | — | none |
| `packages/ui-web/src/lib/cn.ts` | utility | transform | — | none |
| `packages/ui-web/src/test/setup.ts` | test setup | — | — | none (RESEARCH Code Examples) |
| `packages/ui-web/src/styles.css` | style | — | — | none |
| `packages/ui-web/src/index.ts` (barrel named export) | barrel | — | `packages/itinerary/src/index.ts` | role-match |
| `packages/ui-web/src/atoms/*.tsx` (13) + `*.test.tsx` | component | request-response (event) | — | none |
| `packages/ui-web/src/molecules/*.tsx` (12 + `sheet-snap.ts`) + test | component | event-driven | — | none |
| `packages/ui-web/src/token-guard.test.ts`, `exports.test.ts` | test | file-I/O | `packages/config/test/boundaries.test.ts` (quét thư mục, `it.each`) | role-match |
| `apps/web/package.json` — deps, `test`, `engines` | config | — | chính nó + `packages/api-client/package.json` (script `test`) | exact |
| `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts` | config/test setup | — | `packages/config/vitest.config.ts` | role-match |
| `apps/web/src/app/layout.tsx` (sửa), `globals.css` (thay) | route (root layout) / style | request-response | chính nó | exact (thay nội dung) |
| `apps/web/src/app/(public)/*`, `(dashboard)/*`, `not-found.tsx`, `global-error.tsx` | route / file convention | request-response | `apps/web/src/app/layout.tsx`, `page.tsx` | partial |
| `apps/web/src/app/**/*.test.tsx` | test | — | — | none |
| `apps/web/src/components/{app-shell,app-header,user-menu}.tsx` + test | component (organism) | request-response | — | none |
| `apps/web/src/app/icon.svg` (mới); xóa `favicon.ico`, `page.tsx`, `public/*.svg` | asset | — | — | — |

Không cần sửa: `.gitignore` (đã có `.vercel`, `.env*`), `apps/web/tsconfig.json` (đã có `jsx: react-jsx`, alias `@/*`, include `**/*.tsx` và `**/*.mts`), `apps/web/eslint.config.mjs` (trừ khi chọn ban Radix trong `app()`), `apps/web/next.config.ts` (Turbopack tự transpile workspace package).

## Pattern Assignments

### `package.json` (gốc), `pnpm-workspace.yaml`, `turbo.json`

**`package.json` dòng 4:** chỉ đổi một dòng, giữ nguyên scripts gọi turbo.
```json
"packageManager": "pnpm@11.6.0",   // → "pnpm@10.34.6"
```

**`pnpm-workspace.yaml` dòng 5–8: GIỮ NGUYÊN khối `allowBuilds`** (pnpm ≥10.26 hiểu key này, RESEARCH phát hiện 2). Chỉ sửa comment dòng 5 vì "pnpm 11 chặn mặc định" không còn đúng:
```yaml
# Chỉ cho chạy install script khi thật sự cần (pnpm 11 chặn mặc định).
# unrs-resolver: postinstall chỉ kiểm tra/tải native binding; binding đã có qua optionalDependencies.
allowBuilds:
  unrs-resolver: false
```

**Catalog dòng 12–26:** thêm entry theo cùng kiểu, tên có `@` đặt trong nháy kép, version pin cứng, comment cuối dòng khi version có lý do (mẫu dòng 23):
```yaml
  vitest: 4.1.11 # nhánh 4 cuối; Vitest 5.0 (09/2026) đòi @types/node >= 22, catalog đang 20
  tailwindcss: 4.3.3
  "@tailwindcss/turbopack": 4.3.3
```
Mục cần thêm: RESEARCH §Installation (`@base-ui/react` 1.8.0 kèm comment "D-02: không lên 1.9.0", `jsdom` 29.1.1 kèm comment "30.x đòi Node ^24.15", …).

**`turbo.json` dòng 4–7 → thêm `transit`**, theo đúng mẫu của `lint` (dòng 11–13):
```json
"build": {
  "dependsOn": ["^build"],            // → ["^build", "transit"]
  "outputs": [".next/**", "!.next/cache/**"]
},
...
"lint": { "dependsOn": ["transit"] },
```

---

### `packages/config/eslint/boundaries.mjs` (lint preset) — thêm `uiPackage()`

**Analog:** chính file này. 114 dòng, đọc hết trước khi sửa.

**Header + hằng (dòng 1–7):** thêm hằng mới ngay dưới `API_CLIENT`, cùng kiểu.
```js
import { base } from './base.mjs';

const KERNEL = '@tripory/shared-kernel';
const API_CLIENT = '@tripory/api-client';
```

**Default-deny (dòng 16–19), dùng lại nguyên, không viết mới.** Không có trong `allowed` thì bị chặn, nên `radix-ui`, `@radix-ui/*`, `vaul`, `next/*` tự bị chặn trong `ui-web` (D-01).
```js
const allowOnly = (allowed) => ({
  regex: `^(?!${['\\.{1,2}(?:/|$)', ...allowed.map((name) => `${escapeRegex(name)}(?:/|$)`)].join('|')})`,
  message: `Chỉ được import tương đối${allowed.length > 0 ? ` và: ${allowed.join(', ')}` : ''}. Cần thư viện mới thì sửa allowlist trong packages/config/eslint/boundaries.mjs.`,
});
```

**Luật tầng (dòng 22–25), dùng cho atoms ↛ molecules, lib ↛ atoms/molecules:**
```js
const layer = (...names) => ({
  group: names.flatMap((name) => [`**/${name}`, `**/${name}/**`]),
  message: `Tầng này không được import tầng ${names.join(', ')} (ai-memories/tripory-fe--ddd-architecture.md, mục 5).`,
});
```
Lưu ý: message trỏ "mục 5". Khi cập nhật tài liệu kiến trúc, bảng allowlist của `ui-web` phải nằm ở mục 5 để message vẫn đúng.

**Hai chỗ phải mở rộng, mặc định giữ hành vi cũ để 58 test hiện có không đổi:**

1. `rulesFor` (dòng 45, chữ ký `({ allowed, layers = [], pure = false })`): thêm `browser = false`. Khi `browser: true` thì **bỏ hẳn** các mục `BROWSER_GLOBALS` (dòng 52–56) khỏi `no-restricted-globals`. Không xóa cả rule, vì `pure` vẫn cần mục `fetch`.
```js
  'no-restricted-globals': [
    'error',
    ...BROWSER_GLOBALS.map((name) => ({
      name,
      message: 'Code dùng chung web + mobile: không dùng browser global; nhận qua deps.',
    })),
    ...(pure ? [{ name: 'fetch', message: '...' }] : []),
  ],
```

2. `zone` (dòng 85–91) đang gắn cứng `'vitest'` cho file test. Thêm `testAllowed` (mặc định `['vitest']`):
```js
const zone = (root, options) => [
  { files: [`${root}/**/*.{ts,tsx}`], ignores: [`${root}/**/*.test.{ts,tsx}`], rules: rulesFor(options) },
  {
    files: [`${root}/**/*.test.{ts,tsx}`],
    rules: rulesFor({ ...options, allowed: [...options.allowed, 'vitest'] }),   // → ...(options.testAllowed ?? ['vitest'])
  },
];
```

**Mẫu export preset (dòng 94–108).** Preset mới đặt sau `httpPackage`, trước `app`, có JSDoc một dòng như các preset khác:
```js
/** @tripory/shared-kernel: không phụ thuộc package nào. */
export const kernelPackage = () => [...base, ...zone('src', { allowed: [], pure: true })];

/** @tripory/api-client: chỉ phụ thuộc shared-kernel; được dùng fetch. */
export const httpPackage = () => [...base, ...zone('src', { allowed: [KERNEL] })];
```
Mẫu `contextPackage` (dòng 94–102) cho thấy cách xếp nhiều `zone()` cho từng tầng, cộng một block riêng cho `src/index.ts`. `uiPackage()` dùng cùng mẫu. Phác thảo allowlist ở RESEARCH Pattern 1.

**Bẫy thứ tự block (flat config ghi đè `no-restricted-imports`, tài liệu kiến trúc mục 8).** Đặt `zone('src', …)` **trước** `zone('src/atoms')`, `zone('src/molecules')`, `zone('src/lib')` để block tầng con (chặt hơn) đứng sau và thắng.

**Bẫy RESEARCH chưa nêu: `src/test/setup.ts` không phải file `*.test.*`.** Nó khớp block nguồn của `zone('src')` (không có `vitest`, `@testing-library/react`), nên `import { cleanup } from '@testing-library/react'` trong setup sẽ bị chặn. Cần thêm một block riêng `{ files: ['src/test/**/*.ts'], rules: rulesFor({ allowed: UI_TEST, browser: true }) }` đặt sau các zone, và một ca `ok` trong self-test cho file này.

**Tùy chọn (D-01 phủ cả app).** `app()` (dòng 111–114) có hai block, và block sau ghi đè block trước. Nếu thêm pattern chặn `radix-ui`, `@radix-ui/*`, `vaul` thì phải thêm vào **cả hai** block:
```js
export const app = () => [
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport, httpOnlyInComposition] }] } },
  { files: ['src/composition/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport] }] } },
];
```

---

### `packages/config/test/boundaries.test.ts` (test, batch) — thêm ca cho `ui-web`, `design-tokens`

**Analog:** chính file này (142 dòng).

**Hằng thư mục (dòng 37–40):** thêm hai hằng cùng kiểu.
```ts
const itinerary = 'packages/itinerary';
const kernel = 'packages/shared-kernel';
const apiClient = 'packages/api-client';
const web = 'apps/web';
// + const uiWeb = 'packages/ui-web'; const tokens = 'packages/design-tokens';
```

**Ca vi phạm (mẫu dòng 44–58), một dòng mỗi ca, dùng helper `imp()` (dòng 35):**
```ts
const imp = (includes: string): Violation => ({ rule: 'no-restricted-imports', includes });
...
  { name: 'react: next/*', dir: itinerary, file: 'src/react/x.ts', code: "import Link from 'next/link';\nexport const x = Link;", violations: [imp("'next/link'")] },
  { name: 'domain: import() động', dir: itinerary, file: 'src/domain/x.ts', code: "export const load = () => import('react');", violations: [{ rule: 'no-restricted-syntax', includes: 'import()' }] },
```
Thêm nhóm comment `// ui-web` và `// design-tokens` trước `// apps/web` (dòng 88). Ca cụ thể lấy từ RESEARCH Pattern 1, bảng "Ca self-test mới". File ảo của ui-web dùng đuôi `.tsx` (ví dụ `src/atoms/x.tsx`) vì glob `{ts,tsx}` đã phủ.

**Ca hợp lệ (mẫu dòng 95–107):** cùng shape nhưng không có `violations`. Thêm ca `atoms dùng document.body` để chứng minh `browser: true` có hiệu lực, và ca `src/test/setup.ts` import `@testing-library/react` + `vitest`.

**Không cần sửa:** khối `describe('mọi package và app đều nối preset')` (dòng 125–142) tự quét `packages/*` và `apps/*` có `package.json`, nên hai package mới tự được kiểm. `packages/config/turbo.json` đã glob `$TURBO_ROOT$/packages/*/eslint.config.mjs`, nên cache invalidation cũng tự phủ.

**Hệ quả với số test:** tài liệu kiến trúc mục 8 ghi "58 test = 42 + 11 + 5". Sau khi thêm ca, cập nhật con số này (mục 8 là một phần của FND-02).

---

### `packages/config/vitest/ui-preset.mjs` + `ui-preset.d.mts` (config)

**Analog:** `packages/config/vitest/preset.mjs` (toàn file, 15 dòng):
```js
import { defineConfig } from 'vitest/config';

/**
 * Preset test cho package TypeScript thuần: môi trường node.
 * File test của domain/application/kernel không có DOM, nên file nào lén dùng
 * window/document/React sẽ vỡ ngay khi chạy. ...
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```
Preset mới giữ JSDoc tiếng Việt giải thích lý do (jsdom; mỗi package tự khai báo jsdom/RTL vì pnpm isolated). Code ở RESEARCH Code Examples.

**Analog types:** `packages/config/vitest/preset.d.mts`, copy nguyên:
```ts
import type { ViteUserConfig } from 'vitest/config';

declare const preset: ViteUserConfig;
export default preset;
```

**Nối dây (dễ quên):**
- `packages/config/package.json` dòng 6–10: thêm `"./vitest/ui": "./vitest/ui-preset.mjs"` cạnh `"./vitest": "./vitest/preset.mjs"`. TS tìm `ui-preset.d.mts` cạnh file `.mjs`.
- `packages/config/tsconfig.json` dòng 3: `"include": ["test", "vitest.config.ts", "vitest/preset.d.mts"]`, thêm `"vitest/ui-preset.d.mts"`.
- `jsdom` **không** vào `packages/config/package.json` (Pitfall 10); mỗi package dùng preset tự khai báo.

---

### `packages/design-tokens/{package.json, eslint.config.mjs, tsconfig.json, vitest.config.ts}`

**Analog `package.json`:** `packages/shared-kernel/package.json`. Đây là package không có dependency runtime, giống `design-tokens`:
```json
{
  "name": "@tripory/shared-kernel",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "devDependencies": {
    "@tripory/config": "workspace:*",
    "@types/node": "catalog:",
    "eslint": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```
Khác biệt:
- `exports["."]` dùng object điều kiện `{ "style": "./src/index.css", "types": "./src/index.ts", "default": "./src/index.ts" }` (RESEARCH Pattern 2, giả định A1; fallback subpath `./css`).
- `test` bỏ `--passWithNoTests` vì có `tokens.test.ts` (tài liệu kiến trúc mục 8).
- devDeps thêm `"@tailwindcss/node": "catalog:"` và `"tailwindcss": "catalog:"`, vì test compile `@import "tailwindcss"` từ chính package này.

**Analog `eslint.config.mjs`:** `packages/shared-kernel/eslint.config.mjs` (hai dòng):
```js
import { kernelPackage } from '@tripory/config/eslint';
export default kernelPackage();
```
→ `import { uiPackage } from '@tripory/config/eslint'; export default uiPackage({ role: 'tokens' });`

**Analog `tsconfig.json` + `vitest.config.ts`:** `packages/api-client/`, copy nguyên:
```json
{
  "extends": "@tripory/config/tsconfig/library.json",
  "include": ["src", "vitest.config.ts"]
}
```
```ts
import preset from '@tripory/config/vitest';

export default preset;
```
(`design-tokens` test chạy env node nên dùng preset node, không dùng `ui`.)

---

### `packages/design-tokens/src/*.css` (style tokens, build-time transform)

**Analog một phần:** `apps/web/src/app/globals.css` dòng 8–13. Đây là mẫu `@theme inline` duy nhất trong repo, và cũng là ví dụ của **cách sai** cần tránh: tên Tailwind trỏ về biến `:root` cùng tầng, rồi `prefers-color-scheme` ở dòng 15–20.
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) { ... }   /* CẤM theo UI-SPEC: dark chỉ qua [data-theme="dark"] trong dark.css */
```
Nội dung thật lấy từ RESEARCH Pattern 2 (tên nội bộ `--semantic-*`, reset namespace `--color-*: initial`, breakpoint literal) và bảng token đầy đủ của UI-SPEC §Complete Primitive/Semantic Tokens.

### `packages/design-tokens/src/index.ts` (utility)

**Analog:** `packages/shared-kernel/src/index.ts` (`export {};`), chỉ để chứng minh đây là entry. Nội dung thật: `sheetSnapPoints`, `sheetPeekMinPx` dạng `as const` (RESEARCH Pattern 4). Trong `uiPackage({ role: 'tokens' })` file này không import gì.

### `packages/design-tokens/src/tokens.test.ts` (test, file-I/O + transform)

**Analog một phần:** `packages/config/test/boundaries.test.ts` dòng 4–10, mẫu import Node và tính đường dẫn theo `import.meta.url`:
```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
```
Với `tokens.test.ts`: `const srcDir = path.dirname(fileURLToPath(import.meta.url));` làm `base` cho `compile()` của `@tailwindcss/node` (RESEARCH Pattern 3). Thông điệp `expect(x, '<giải thích tiếng Việt>')` theo mẫu dòng 114.

---

### `packages/ui-web/{package.json, eslint.config.mjs, tsconfig.json, vitest.config.ts, turbo.json}`

**Analog `package.json`:** `packages/itinerary/package.json`. Đây là package có `dependencies` workspace, `exports` nhiều entry, và (theo tài liệu kiến trúc mục 4) `peerDependencies` cho React:
```json
  "exports": {
    ".": "./src/index.ts",
    "./http": "./src/infrastructure/index.ts",
    "./react": "./src/react/index.ts"
  },
  "dependencies": {
    "@tripory/api-client": "workspace:*",
    "@tripory/shared-kernel": "workspace:*"
  },
```
Áp vào `ui-web`:
- `exports`: `".": "./src/index.ts"`, `"./styles.css": "./src/styles.css"`.
- `dependencies`: `@tripory/design-tokens: workspace:*` cùng các deps D-03 (`catalog:`).
- `peerDependencies` + `devDependencies`: `react`, `react-dom`, `@types/react`, `@types/react-dom` (tài liệu kiến trúc mục 9: React là peer, không phải dependency).
- devDeps test: `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `vitest`.
- `"test": "vitest run"`, không có `--passWithNoTests`.

**Analog `eslint.config.mjs`:** `packages/api-client/eslint.config.mjs`:
```js
import { httpPackage } from '@tripory/config/eslint';

export default httpPackage();
```
→ `uiPackage()`.

**Analog `tsconfig.json`:** `packages/api-client/tsconfig.json`, thêm `compilerOptions.jsx`. `library.json` **không có** `jsx`, nên `.tsx` không typecheck được nếu thiếu:
```json
{
  "extends": "@tripory/config/tsconfig/library.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["src", "vitest.config.ts"]
}
```
`library.json` bật `verbatimModuleSyntax: true` và `isolatedModules: true`, nên mọi import chỉ dùng type phải là `import type` (ví dụ `import type { VariantProps } from 'class-variance-authority'`), và re-export type trong barrel dùng `export type { … }`.

**Analog `vitest.config.ts`:** `packages/config/vitest.config.ts`, mẫu `mergeConfig(preset, …)`:
```ts
import { mergeConfig } from 'vitest/config';
import preset from './vitest/preset.mjs';

export default mergeConfig(preset, {
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
```
→ `import uiPreset from '@tripory/config/vitest/ui'; export default mergeConfig(uiPreset, { test: { setupFiles: ['./src/test/setup.ts'] } });`

**Analog `turbo.json` (khuyến nghị):** `packages/config/turbo.json`. `token-guard.test.ts` theo RESEARCH Pattern 3 quét cả `apps/web/src/components/`, một thư mục **nằm ngoài** đồ thị phụ thuộc của `ui-web`. Vì vậy cache của `@tripory/ui-web#test` không bị bỏ khi sửa organism, cùng loại bẫy mà `config/turbo.json` đã giải:
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "extends": ["//"],
  "tasks": {
    "test": {
      "inputs": [
        "$TURBO_DEFAULT$",
        "$TURBO_ROOT$/packages/*/package.json",
        ...
      ]
    }
  }
}
```
→ `inputs: ["$TURBO_DEFAULT$", "$TURBO_ROOT$/apps/web/src/components/**"]`. Phương án khác: đặt phần quét `apps/web/src/components` trong một guard test riêng của `apps/web`.

---

### `packages/ui-web/src/index.ts` (barrel)

**Analog:** `packages/itinerary/src/index.ts`:
```ts
export * from './domain';
export * from './application';
```
Áp vào: `export * from './atoms/button';` … cho từng file, **không có `'use client'` ở barrel** (RESEARCH Anti-Patterns). Compound children dùng named export (`DialogTitle`, `TabsPanel`, `FormFieldError`), không dùng static property. `exports.test.ts` khẳng định điều này qua entry public.

### `packages/ui-web/src/atoms/*`, `molecules/*`, `lib/cn.ts`, `styles.css`, `test/setup.ts`

**Không có analog trong repo.** Nguồn:
- Source gốc: `pnpm dlx shadcn@4.21.4 view <item>` (style `base-nova`). **Không** chạy `init`/`add` ở chế độ ghi (Pitfall 5). Port vào `atoms/`/`molecules/`, đổi mọi class tùy ý sang token (`z-50` → `z-(--z-modal)`, `duration-450` → `duration-(--motion-duration-slow)`, `bg-black/10` → `bg-overlay`).
- Primitive cho từng component: RESEARCH §Standard Stack, bảng "Primitive cho từng component".
- Sheet: RESEARCH Pattern 4 và Code Examples (`sheet-snap.ts` thuần, unit test riêng).
- `test/setup.ts`: RESEARCH Code Examples (cleanup, `BASE_UI_ANIMATIONS_DISABLED`, stub `matchMedia`).
- Test mẫu Dialog bằng bàn phím: RESEARCH Code Examples. Ma trận test: UI-SPEC §Ma trận tương tác bắt buộc.
- `'use client'` đặt ở từng file component dùng hook/Base UI. `EmptyState`, `Card`, `Badge`, `Skeleton` để tĩnh để render được từ Server Component.

### `packages/ui-web/src/token-guard.test.ts`, `exports.test.ts` (test, file-I/O)

**Analog:** `packages/config/test/boundaries.test.ts` dòng 125–142, mẫu quét thư mục bằng `readdirSync` và tạo test bằng `it.each`, mỗi file một test có message rõ:
```ts
describe('mọi package và app đều nối preset', () => {
  const listDirs = (parent: string) =>
    readdirSync(path.join(repoRoot, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(repoRoot, parent, entry.name, 'package.json')))
      .map((entry) => `${parent}/${entry.name}`);

  const targets = [...listDirs('packages'), ...listDirs('apps')];

  it.each(targets)('%s có eslint.config.mjs gọi @tripory/config/eslint', (dir) => {
    const configPath = path.join(repoRoot, dir, 'eslint.config.mjs');
    expect(existsSync(configPath), `${dir} thiếu eslint.config.mjs`).toBe(true);
    ...
  });
});
```
Áp vào: `readdirSync(dir, { recursive: true })` lọc `*.tsx` (bỏ `*.test.tsx`), dùng `it.each(files)` với tên file, và message `expect` chỉ ra class vi phạm. Danh sách regex lấy từ RESEARCH Pattern 3. Với allowlist ESLint, `node:fs`, `node:path`, `node:url` phải có trong `UI_TEST`.

---

### `apps/web/package.json` (config)

**Analog:** chính file + `packages/api-client/package.json` (script `test`).
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "next typegen && tsc --noEmit"
  },
```
Thêm:
- `"test": "vitest run"`.
- `"engines": { "node": "24.x" }` (D-20, RESEARCH Pattern 7).
- `dependencies`: `"@tripory/ui-web": "workspace:*"`, `"@tripory/design-tokens": "workspace:*"`. `globals.css` `@import` cả hai nên pnpm isolated bắt buộc khai báo.
- `devDependencies`: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` (`catalog:`).
- Giữ thứ tự key alphabet trong `dependencies`/`devDependencies` như hiện tại.

### `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts`

**Analog:** `packages/config/vitest.config.ts` (`mergeConfig`, xem trên). Khác biệt: `resolve: { tsconfigPaths: true }` cho alias `@/*` (tsconfig dòng 21–23), `setupFiles: ['./src/test/setup.ts']`. Style nháy kép theo app.

`apps/web/tsconfig.json` include `**/*.ts`, `**/*.tsx`, `**/*.mts`, nên `vitest.config.ts` và mọi test đều đi qua `tsc --noEmit` của `typecheck`. Không cần sửa tsconfig, nhưng test phải typecheck sạch (ví dụ props `error.tsx` phải đúng kiểu khi render trong test).

`app()` preset không có allowlist, nên test trong `apps/web` import `vitest`/RTL không bị ESLint chặn. Ngược lại, `eslint-config-next` vẫn áp lên file test.

---

### `apps/web/src/app/layout.tsx` (root layout, sửa)

**Analog:** chính file, toàn bộ 30 dòng. Giữ khung, thay nội dung:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";   // → Inter
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",                       // → "--font-inter" (semantic.css trỏ var(--font-inter))
  subsets: ["latin"],                                  // → ["latin", "vietnamese"] (A12)
});

export const metadata: Metadata = {
  title: "Create Next App",                            // → "Tripory" (D-17)
  description: "Generated by create next app",         // → "Lập và chia sẻ lịch trình du lịch"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"                                        // → "vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```
Giữ:
- `import type { Metadata }`.
- Kiểu props toàn cục `LayoutProps<"…">` do `next typegen` sinh (script `typecheck` đã chạy `next typegen`). Group layout `(public)/layout.tsx`, `(dashboard)/layout.tsx` dùng cùng helper. Literal route chính xác cho layout của route group thì xác nhận bằng `.next/types` sau `next typegen`.

Bỏ `Geist_Mono`. `h-full`, `min-h-full flex flex-col` có thể giữ nếu AppShell không thay thế. Không còn class palette nào ở đây.

### `apps/web/src/app/globals.css` (thay toàn bộ)

**Analog:** chính file, là nội dung **bị thay**. Dòng 1 `@import "tailwindcss";` giữ lại. Dòng 3–26 (`:root` hex, `@theme inline` cục bộ, `prefers-color-scheme`, `font-family: Arial`) xóa hết. Nội dung mới chỉ ghép (RESEARCH Pattern 2):
```css
@import "tailwindcss";
@import "@tripory/design-tokens";
@import "@tripory/ui-web/styles.css";
@source "../../../../packages/ui-web/src";
```
`next.config.ts` dòng 7–13 đã có loader `@tailwindcss/turbopack` cho `*.css`, không cần sửa.

### Route group + file convention (`(public)/*`, `(dashboard)/*`, `not-found.tsx`, `global-error.tsx`)

**Analog một phần:** `layout.tsx` (mẫu `export default function`, `Metadata`, `LayoutProps`) và `page.tsx` (mẫu default export Server Component, là file **sẽ bị xóa**: Pitfall 7, trùng route `/` với `(public)/page.tsx`). Nội dung `page.tsx` hiện tại chứa đủ loại class bị guard cấm (`bg-zinc-50`, `dark:`, `px-16`, `bg-[#383838]`, `w-[158px]`), dùng làm ca kiểm guard nếu cần.

Nội dung thật lấy từ RESEARCH Pattern 6 và Code Examples:
- `error.tsx`: `'use client'` + `ErrorState onRetry`.
- Root `not-found.tsx`: tự bọc `AppShell variant="public"`, export `metadata`.
- `global-error.tsx`: tự có `<html lang="vi"><body>`, import `globals.css` và gắn `inter.variable` (Pitfall 14).
- `loading.tsx`: Skeleton + `role="status"`.

Docs Next đúng phiên bản: `apps/web/node_modules/next/dist/docs/` (sau khi cài lại; hiện trống), dự phòng nextjs.org 16.4.

### `apps/web/src/components/{app-shell,app-header,user-menu}.tsx` + test

**Không có analog** (thư mục `components/` chưa tồn tại). Theo RESEARCH Pattern 5 và UI-SPEC §AppShell & AppHeader:
- Phần active route dùng `usePathname`, tách thành client component nhỏ.
- Test mock `next/navigation` theo RESEARCH Code Examples.
- Import component từ `@tripory/ui-web` (entry public), không import sâu `@tripory/ui-web/src/**` (bị `noDeepImport` chặn).

---

## Shared Patterns

### Nối package mới vào hệ cưỡng chế
**Source:** tài liệu kiến trúc mục 8, đoạn "Thêm package/app mới", cùng 4 file của `packages/api-client/`.
**Apply to:** `packages/design-tokens`, `packages/ui-web`.
Mỗi package có đủ 4 file:
- `package.json`: devDep `@tripory/config: workspace:*`, scripts `lint`/`typecheck`/`test` cùng tên để turbo `transit` nối.
- `eslint.config.mjs`: một dòng gọi preset từ `@tripory/config/eslint`. Self-test kiểm chuỗi này.
- `tsconfig.json`: extends `@tripory/config/tsconfig/library.json`.
- `vitest.config.ts`: lấy preset.

### Version qua `catalog:`
**Source:** `pnpm-workspace.yaml` dòng 10–26, mọi `package.json` hiện có.
**Apply to:** mọi dependency mới. Trong `package.json` luôn ghi `"catalog:"`; version thật chỉ nằm trong `pnpm-workspace.yaml`. Ngoại lệ có sẵn: `turbo` pin trực tiếp ở root `package.json`. Workspace package ghi `"workspace:*"`.

### Default-deny allowlist + self-test đi kèm
**Source:** `boundaries.mjs` dòng 16–19, cùng `boundaries.test.ts` dòng 42–107.
**Apply to:** mọi thay đổi trong `uiPackage()`. Mỗi module thêm vào allowlist cần ít nhất một ca `ok`. Mỗi thứ phải bị chặn (`radix-ui`, `vaul`, `next/*`, tầng chéo, import sâu, `import()`) cần một ca `bad`. Quy tắc để mức `'error'`.

### Comment giải thích lý do bằng tiếng Việt
**Source:** `preset.mjs` dòng 3–8, `boundaries.mjs` dòng 1–3, `pnpm-workspace.yaml` dòng 5–6 và 23.
**Apply to:** preset, config và catalog mới. Comment nói *vì sao* (ràng buộc, quyết định D-xx, pitfall), không mô tả lại code.

### Named export + `import type`
**Source:** tài liệu kiến trúc mục 9 (compound component qua ranh giới server/client), `library.json` (`verbatimModuleSyntax`).
**Apply to:** mọi file trong `ui-web` và `apps/web/src/components`.

## No Analog Found

| File | Role | Data Flow | Lý do / nguồn thay thế |
|---|---|---|---|
| `packages/ui-web/src/atoms/*.tsx` (13) + test | component | event | Repo chưa có React component. Nguồn: shadcn `base-nova` (`view`), RESEARCH §Standard Stack |
| `packages/ui-web/src/molecules/*.tsx` (12) + test | component | event-driven | Như trên; Sheet theo RESEARCH Pattern 4 |
| `packages/ui-web/src/molecules/sheet-snap.ts` + test | utility | transform | RESEARCH Code Examples |
| `packages/ui-web/src/lib/cn.ts` | utility | transform | `clsx` + `tailwind-merge` (mẫu shadcn) |
| `packages/ui-web/src/test/setup.ts`, `apps/web/src/test/setup.ts` | test setup | — | RESEARCH Code Examples |
| `packages/ui-web/src/styles.css` | style | — | `@import "tw-animate-css";` (Pitfall 10) |
| `packages/design-tokens/src/*.css` | style tokens | build-time | RESEARCH Pattern 2 + bảng token UI-SPEC |
| `packages/ui-web/components.json`, `apps/web/components.json` | config | — | Viết tay theo ui.shadcn.com/docs/monorepo; không chạy `shadcn init` |
| `apps/web/src/components/*.tsx` + test | organism | request-response | RESEARCH Pattern 5 |
| `apps/web/src/app/(public)/*`, `(dashboard)/*` | route | request-response | RESEARCH Pattern 6; docs Next 16.4 |
| `apps/web/src/app/not-found.tsx`, `global-error.tsx` | route convention | — | RESEARCH Pattern 6 + Code Examples |
| `apps/web/src/app/**/*.test.tsx` | test | — | RESEARCH Code Examples (`error.test.tsx`) |
| `apps/web/src/app/icon.svg` | asset | — | D-16 (chữ "T" trắng, nền `#C44728`, bo 8px) |
| Bước deploy Vercel (không có file trong repo) | infra | — | RESEARCH Pattern 7; checkpoint người dùng D-18 |

## Metadata

**Analog search scope:** toàn bộ file tracked trong `apps/`, `packages/`, cùng `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore` ở gốc (`git ls-files`).
**Files scanned:** 47 file tracked; đọc đầy đủ 26 file analog. Không đọc `node_modules` (đang hỏng theo RESEARCH Pitfall 1). Không chạy install.
**Pattern extraction date:** 2026-10-11
