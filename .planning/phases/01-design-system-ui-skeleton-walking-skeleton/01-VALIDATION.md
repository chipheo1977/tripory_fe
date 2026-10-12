---
phase: 1
slug: design-system-ui-skeleton-walking-skeleton
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-11
completed: 2026-10-12
production_url: https://triporyv1.vercel.app
approved: true
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Nguồn: `01-RESEARCH.md` §Validation Architecture. Task ID trong bảng dưới do planner điền khi tạo PLAN.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11; jsdom 29.1.1 + `@testing-library/react` 16.3.3 + `@testing-library/dom` 10.4.2 + `@testing-library/user-event` 14.6.7 cho `ui-web`/`apps/web`; env node cho `config`, `design-tokens` |
| **Config file** | `packages/config/vitest/preset.mjs`, `packages/config/vitest/ui-preset.mjs`, package/app Vitest configs, và test setup cho `ui-web`/`apps/web` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Evidence | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------|--------|
| 01-01-01 | 01-01 | 0 | FND-01 | T-01-01 | Pin dependency/install scripts | smoke | `pnpm --version; pnpm install --frozen-lockfile; pnpm --filter @tripory/web build` | Plan 01-01 summary | ✅ green |
| 01-01-02 | 01-01 | 0 | FND-02, DS-02 | T-01-02 | Default-deny boundary | unit (ESLint thật) | `pnpm --filter @tripory/config test` | `packages/config/test/boundaries.test.ts` | ✅ green |
| 01-01-03 | 01-01 | 0 | DS-07 | T-01-01 | Pinned UI test stack | smoke | `pnpm --filter @tripory/ui-web test; pnpm --filter @tripory/web test` | Package/app test configs | ✅ green |
| 01-02-01 | 01-02 | 1 | DS-01 | T-01-03 | Token integrity | unit (file contract) | `pnpm --filter @tripory/design-tokens test` | `packages/design-tokens/src/tokens.test.ts` | ✅ green |
| 01-02-02 | 01-02 | 1 | DS-01, DS-06 | T-01-03, T-01-04 | Compile/constant consistency | unit (Tailwind compile) | `pnpm --filter @tripory/design-tokens test` | `packages/design-tokens/src/tokens.test.ts` | ✅ green |
| 01-03-01 | 01-03 | 2 | DS-03, DS-07 | T-01-05 | Accessible controls | unit (RTL) | `pnpm --filter @tripory/ui-web test -- button icon-button input textarea label checkbox switch` | Control atom tests | ✅ green |
| 01-03-02 | 01-03 | 2 | DS-03, DS-07 | T-01-05 | Accessible display semantics | unit (RTL) | `pnpm --filter @tripory/ui-web test -- avatar badge spinner skeleton separator icon` | Display atom tests | ✅ green |
| 01-03-03 | 01-03 | 2 | DS-06, DS-07 | T-01-06 | Hard-code/source guard | unit (file scan) | `pnpm --filter @tripory/ui-web test -- token-guard` | `packages/ui-web/src/token-guard.test.ts` | ✅ green |
| 01-04-01 | 01-04 | 3 | DS-04, FND-06 | T-01-07 | Label/error association | unit (RTL) | `pnpm --filter @tripory/ui-web test -- form-field search-input` | Tests near source | ✅ green |
| 01-04-02 | 01-04 | 3 | DS-04, FND-06 | T-01-08 | Keyboard popup/roving focus | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- select tabs` | Tests near source | ✅ green |
| 01-04-03 | 01-04 | 3 | DS-04, FND-06 | T-01-08 | Keyboard popup/focus restore | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- dropdown-menu tooltip` | Tests near source | ✅ green |
| 01-05-01 | 01-05 | 3 | DS-04, FND-06 | T-01-10 | Focus trap/live region | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- toast dialog` | Tests near source | ✅ green |
| 01-05-02 | 01-05 | 3 | DS-04 | T-01-09 | No fake interaction/data | unit (RTL) | `pnpm --filter @tripory/ui-web test -- card empty-state` | Tests near source | ✅ green |
| 01-05-03 | 01-05 | 3 | FND-04, DS-04 | T-01-09 | Error detail redaction | unit (RTL) | `pnpm --filter @tripory/ui-web test -- error-state` | `error-state.test.tsx` | ✅ green |
| 01-06-01 | 01-06 | 4 | DS-04 | T-01-12 | Snap constant integrity | unit | `pnpm --filter @tripory/ui-web test -- sheet-snap` | `sheet-snap.test.ts` | ✅ green |
| 01-06-02 | 01-06 | 4 | DS-04, FND-06 | T-01-11 | Modal/non-modal focus safety | unit (RTL) | `pnpm --filter @tripory/ui-web test -- sheet` | `sheet.test.tsx` | ✅ green |
| 01-06-03 | 01-06 | 4 | DS-06, DS-07 | T-01-12 | Public API contract | unit | `pnpm --filter @tripory/ui-web test -- exports` | `exports.test.ts` | ✅ green |
| 01-07-01 | 01-07 | 5 | FND-03, DS-05 | T-01-14 | No fake identity/action | unit (RTL) | `pnpm --filter @tripory/web test -- components` | Organism tests | ✅ green |
| 01-07-02 | 01-07 | 5 | FND-03, DS-05 | T-01-15 | Route/build integrity | unit + build | `pnpm --filter @tripory/web test -- app; pnpm --filter @tripory/web build` | Route tests and Plan 01-07 summary | ✅ green |
| 01-07-03 | 01-07 | 5 | FND-04 | T-01-13 | Error redaction/retry | unit + smoke | `pnpm --filter @tripory/web test -- app; pnpm build` | Convention tests and Plan 01-07 summary | ✅ green |
| 01-08-01 | 01-08 | 6 | FND-07 | T-01-16 | Credentials ignored | CLI smoke | `git check-ignore .vercel/project.json; pnpm dlx vercel@63.1.2 project inspect` | Linked project; `.vercel/` ignored and uncommitted | ✅ green |
| 01-08-02 | 01-08 | 6 | FND-07 | T-01-17 | Server-side clean build | deploy smoke | `pnpm dlx vercel@63.1.2 inspect --logs <deployment-url>` | `01-08-deploy.json`: READY, pnpm 10.34.6, Node 24.x | ✅ green |
| 01-08-03 | 01-08 | 6 | FND-03, FND-04, FND-07 | T-01-18 | Public alias/status check | HTTP + manual | Production HTTP smoke and four-viewport review | `01-08-smoke.json`; `01-08-visual-approval.json`: approved true | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Plan 01-08 production evidence closes the phase validation contract.*

---

## Wave 0 Requirements

- [x] `package.json` gốc: `packageManager: pnpm@10.34.6`; lockfile/install baseline
- [x] `turbo.json`: build dependency baseline
- [x] `packages/config/eslint/boundaries.mjs`: UI/default-deny boundary coverage
- [x] `packages/config/vitest/ui-preset.mjs` và package UI test setup
- [x] Khung `packages/design-tokens` và `packages/ui-web` với lint/type/test configs
- [x] `apps/web`: pinned UI test dependencies, test setup, và `engines.node: "24.x"`
- [x] Catalog versions trong `pnpm-workspace.yaml`

---

## Manual-Only Verifications

| Behavior | Requirement | Result | Evidence |
|----------|-------------|--------|----------|
| 4 viewport không tràn, safe-area, vùng chạm ≥44px, bàn phím đi qua header/main/dialog/sheet, reduced motion | FND-03, FND-07 | ✅ APPROVED ở 320×568, 390×844, 768×1024, 1440×900 | `01-08-visual-approval.json` (`approved: true`) |
| Deploy production trên Vercel với Node 24 + pnpm 10 | FND-07 | ✅ READY với pnpm 10.34.6 và Node.js 24.x | `01-08-deploy.json` |
| URL sai trả 404 trên Vercel | FND-04 | ✅ `/not-found` trả HTTP 404 | `01-08-smoke.json` |

**Production URL:** `https://triporyv1.vercel.app`

---

## Validation Sign-Off

- [x] All tasks have automated verification or captured external evidence
- [x] Sampling continuity: no 3 consecutive tasks without automated verification
- [x] Wave 0 covers all required test infrastructure
- [x] No watch-mode flags
- [x] Feedback latency target retained
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Plan 01-08 production build and HTTP smoke passed
- [x] Four-viewport manual checkpoint approved

**Approval:** approved (`approved: true`) on 2026-10-12 for `https://triporyv1.vercel.app`.
