---
phase: 1
slug: design-system-ui-skeleton-walking-skeleton
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Nguồn: `01-RESEARCH.md` §Validation Architecture. Task ID trong bảng dưới do planner điền khi tạo PLAN.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11; jsdom 29.1.1 + `@testing-library/react` 16.3.3 + `@testing-library/dom` 10.4.2 + `@testing-library/user-event` 14.6.7 cho `ui-web`/`apps/web`; env node cho `config`, `design-tokens` |
| **Config file** | Có: `packages/config/vitest/preset.mjs` (node). Wave 0 tạo: `packages/config/vitest/ui-preset.mjs`, `packages/ui-web/vitest.config.ts`, `packages/design-tokens/vitest.config.ts`, `apps/web/vitest.config.ts`, `src/test/setup.ts` cho `ui-web` và `apps/web` |
| **Quick run command** | `pnpm --filter <pkg> test` (`@tripory/ui-web`, `@tripory/web`, `@tripory/config`, `@tripory/design-tokens`) |
| **Full suite command** | `pnpm lint; pnpm typecheck; pnpm test; pnpm build` (từ gốc repo) |
| **Estimated runtime** | ~120 seconds (full suite, ước lượng) |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter <pkg> test` + `pnpm --filter <pkg> lint` cho package vừa sửa
- **After every plan wave:** `pnpm lint; pnpm typecheck; pnpm test`
- **Before `/gsd-verify-work`:** cả 4 lệnh gate xanh từ gốc + smoke tay 4 viewport trên domain production
- **Max feedback latency:** 60 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | FND-01 | — | N/A | smoke | `pnpm --version` (=10.34.6) + 4 lệnh gate | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | FND-02 | — | N/A | unit (ESLint thật) | `pnpm --filter @tripory/config test` | ✅ `packages/config/test/boundaries.test.ts` (mở rộng) | ⬜ pending |
| TBD | TBD | TBD | DS-01 | — | N/A | unit (compile) | `pnpm --filter @tripory/design-tokens test` | ❌ `packages/design-tokens/src/tokens.test.ts` | ⬜ pending |
| TBD | TBD | TBD | DS-06 | — | N/A | unit (quét file) | `pnpm --filter @tripory/ui-web test -- token-guard` | ❌ `packages/ui-web/src/token-guard.test.ts` | ⬜ pending |
| TBD | TBD | TBD | DS-06 | — | N/A | unit | `pnpm --filter @tripory/ui-web test -- exports` | ❌ `packages/ui-web/src/exports.test.ts` | ⬜ pending |
| TBD | TBD | TBD | DS-03 | — | N/A | unit (RTL) | `pnpm --filter @tripory/ui-web test -- atoms` | ❌ `src/atoms/*.test.tsx` | ⬜ pending |
| TBD | TBD | TBD | DS-04, FND-06 | — | N/A | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- molecules` | ❌ `src/molecules/*.test.tsx` | ⬜ pending |
| TBD | TBD | TBD | FND-06 (D-06, D-07) | — | N/A | unit (RTL) | `pnpm --filter @tripory/ui-web test -- sheet dialog` | ❌ `src/molecules/sheet.test.tsx`, `dialog.test.tsx`, `sheet-snap.test.ts` | ⬜ pending |
| TBD | TBD | TBD | DS-05, FND-03 | — | N/A | unit (RTL) | `pnpm --filter @tripory/web test -- components` | ❌ `apps/web/src/components/*.test.tsx` | ⬜ pending |
| TBD | TBD | TBD | FND-04 (D-15) | — | N/A | unit (RTL) | `pnpm --filter @tripory/web test -- app` | ❌ `apps/web/src/app/**/*.test.tsx` | ⬜ pending |
| TBD | TBD | TBD | FND-04 | — | N/A | smoke | `pnpm --filter @tripory/web build` → `next start` → `Invoke-WebRequest /khong-ton-tai` trả 404 | ❌ | ⬜ pending |
| TBD | TBD | TBD | DS-07 | — | N/A | unit | guard: không có `apps/web/src/app/**/dev/**`, không dependency `storybook` (có thể gộp vào `token-guard.test.ts`) | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` gốc: `packageManager: pnpm@10.34.6`; xóa và cài lại `node_modules`; lockfile mới
- [ ] `turbo.json`: `build.dependsOn` thêm `transit`
- [ ] `packages/config/eslint/boundaries.mjs`: `uiPackage()` + tham số `browser`/`testAllowed` cho `zone()`; `boundaries.test.ts` thêm ca bad/ok
- [ ] `packages/config/vitest/ui-preset.mjs` + export `./vitest/ui` (+ file `.d.mts` như preset hiện có)
- [ ] Khung `packages/design-tokens` và `packages/ui-web` (`package.json`, `eslint.config.mjs`, `tsconfig.json` có `jsx: react-jsx`, `vitest.config.ts`, `src/test/setup.ts`)
- [ ] `apps/web`: devDeps `vitest`, `jsdom`, RTL, user-event; script `test`; `vitest.config.ts`; `src/test/setup.ts`; `engines.node: "24.x"`
- [ ] Catalog `pnpm-workspace.yaml`: thêm mọi version ở RESEARCH §Installation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4 viewport không tràn, safe-area, vùng chạm ≥44px, bàn phím đi qua header/main/dialog/sheet, reduced motion | FND-03, FND-07 | Không có Playwright ở Phase 1 (D-23) | Smoke tay trên `<project>.vercel.app` ở 4 viewport của UI-SPEC |
| Deploy production trên Vercel với Node 24 + pnpm 10 | FND-07 | Cần `vercel login/link` của người dùng (checkpoint D-18) | `pnpm dlx vercel@63.1.2 deploy --prod`; log build có "pnpm 10.34.6" và Node 24 |
| URL sai trả 404 trên Vercel | FND-04 | Cần URL production thật | Mở `<domain>/khong-ton-tai`, thấy trang 404 và status 404 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
