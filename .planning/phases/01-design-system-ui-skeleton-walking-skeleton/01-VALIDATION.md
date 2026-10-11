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
| 01-01-01 | 01-01 | 0 | FND-01 | T-01-01 | Pin dependency/install scripts | smoke | `pnpm --version; pnpm install --frozen-lockfile; pnpm --filter @tripory/web build` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01-01 | 0 | FND-02, DS-02 | T-01-02 | Default-deny boundary | unit (ESLint thật) | `pnpm --filter @tripory/config test` | ✅ mở rộng `packages/config/test/boundaries.test.ts` | ⬜ pending |
| 01-01-03 | 01-01 | 0 | DS-07 | T-01-01 | Pinned UI test stack | smoke | `pnpm --filter @tripory/ui-web test; pnpm --filter @tripory/web test` | ❌ W0 configs/setup | ⬜ pending |
| 01-02-01 | 01-02 | 1 | DS-01 | T-01-03 | Token integrity | unit (file contract) | `pnpm --filter @tripory/design-tokens test` | ❌ `packages/design-tokens/src/tokens.test.ts` | ⬜ pending |
| 01-02-02 | 01-02 | 1 | DS-01, DS-06 | T-01-03, T-01-04 | Compile/constant consistency | unit (Tailwind compile) | `pnpm --filter @tripory/design-tokens test` | ❌ `packages/design-tokens/src/tokens.test.ts` | ⬜ pending |
| 01-03-01 | 01-03 | 2 | DS-03, DS-07 | T-01-05 | Accessible controls | unit (RTL) | `pnpm --filter @tripory/ui-web test -- button icon-button input textarea label checkbox switch` | ❌ control atom tests | ⬜ pending |
| 01-03-02 | 01-03 | 2 | DS-03, DS-07 | T-01-05 | Accessible display semantics | unit (RTL) | `pnpm --filter @tripory/ui-web test -- avatar badge spinner skeleton separator icon` | ❌ display atom tests | ⬜ pending |
| 01-03-03 | 01-03 | 2 | DS-06, DS-07 | T-01-06 | Hard-code/source guard | unit (file scan) | `pnpm --filter @tripory/ui-web test -- token-guard` | ❌ `packages/ui-web/src/token-guard.test.ts` | ⬜ pending |
| 01-04-01 | 01-04 | 3 | DS-04, FND-06 | T-01-07 | Label/error association | unit (RTL) | `pnpm --filter @tripory/ui-web test -- form-field search-input` | ❌ tests gần source | ⬜ pending |
| 01-04-02 | 01-04 | 3 | DS-04, FND-06 | T-01-08 | Keyboard popup/roving focus | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- select tabs` | ❌ tests gần source | ⬜ pending |
| 01-04-03 | 01-04 | 3 | DS-04, FND-06 | T-01-08 | Keyboard popup/focus restore | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- dropdown-menu tooltip` | ❌ tests gần source | ⬜ pending |
| 01-05-01 | 01-05 | 3 | DS-04, FND-06 | T-01-10 | Focus trap/live region | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- toast dialog` | ❌ tests gần source | ⬜ pending |
| 01-05-02 | 01-05 | 3 | DS-04 | T-01-09 | No fake interaction/data | unit (RTL) | `pnpm --filter @tripory/ui-web test -- card empty-state` | ❌ tests gần source | ⬜ pending |
| 01-05-03 | 01-05 | 3 | FND-04, DS-04 | T-01-09 | Error detail redaction | unit (RTL) | `pnpm --filter @tripory/ui-web test -- error-state` | ❌ `error-state.test.tsx` | ⬜ pending |
| 01-06-01 | 01-06 | 4 | DS-04 | T-01-12 | Snap constant integrity | unit | `pnpm --filter @tripory/ui-web test -- sheet-snap` | ❌ `sheet-snap.test.ts` | ⬜ pending |
| 01-06-02 | 01-06 | 4 | DS-04, FND-06 | T-01-11 | Modal/non-modal focus safety | unit (RTL) | `pnpm --filter @tripory/ui-web test -- sheet` | ❌ `sheet.test.tsx` | ⬜ pending |
| 01-06-03 | 01-06 | 4 | DS-06, DS-07 | T-01-12 | Public API contract | unit | `pnpm --filter @tripory/ui-web test -- exports` | ❌ `exports.test.ts` | ⬜ pending |
| 01-07-01 | 01-07 | 5 | FND-03, DS-05 | T-01-14 | No fake identity/action | unit (RTL) | `pnpm --filter @tripory/web test -- components` | ❌ organism tests | ⬜ pending |
| 01-07-02 | 01-07 | 5 | FND-03, DS-05 | T-01-15 | Route/build integrity | unit + build | `pnpm --filter @tripory/web test -- app; pnpm --filter @tripory/web build` | ❌ route tests | ⬜ pending |
| 01-07-03 | 01-07 | 5 | FND-04 | T-01-13 | Error redaction/retry | unit + smoke | `pnpm --filter @tripory/web test -- app; pnpm build` | ❌ convention tests | ⬜ pending |
| 01-08-01 | 01-08 | 6 | FND-07 | T-01-16 | Credentials ignored | CLI smoke | `git check-ignore .vercel/project.json; pnpm dlx vercel@63.1.2 project inspect` | external checkpoint | ⬜ pending |
| 01-08-02 | 01-08 | 6 | FND-07 | T-01-17 | Server-side clean build | deploy smoke | `pnpm dlx vercel@63.1.2 inspect --logs <deployment-url>` | external deployment | ⬜ pending |
| 01-08-03 | 01-08 | 6 | FND-03, FND-04, FND-07 | T-01-18 | Public alias/status check | HTTP + manual | `Invoke-WebRequest https://<project>.vercel.app/` và xác nhận unmatched = 404 | production URL | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. `nyquist_compliant` giữ `false` cho tới khi execution xanh.*

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
