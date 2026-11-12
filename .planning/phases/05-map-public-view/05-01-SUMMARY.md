---
phase: 05-map-public-view
plan: 01
subsystem: infra
tags: [uqr, qr, design-tokens, htmlLimitedBots, open-graph, wave-1]
provides:
  - "`uqr` 0.1.3 pin cứng trong `catalog:`, chỉ `apps/web` phụ thuộc"
  - "Token `--share-qr-size: 192px` + test token"
  - "`htmlLimitedBots` = regex mặc định Next 16.4.0 + `Zalo|Facebot|meta-externalagent`, có test khóa"
key-files:
  created:
    - apps/web/src/next-config.test.ts
  modified:
    - pnpm-workspace.yaml
    - apps/web/package.json
    - pnpm-lock.yaml
    - packages/design-tokens/src/components.css
    - packages/design-tokens/src/tokens.test.ts
    - apps/web/next.config.ts
requirements-completed: [PUB-04, PUB-05]
completed: 2026-11-11
---
# Phase 5 Plan 01: uqr, token QR, htmlLimitedBots Summary

**Thư viện QR pin cứng, token cạnh mã QR và danh sách bot HTML-limited có Zalo/Facebot/meta-externalagent.**

## Accomplishments
- `uqr: 0.1.3` trong `pnpm-workspace.yaml` catalog; `apps/web` dùng `"uqr": "catalog:"`; không package nào trong `packages/*` phụ thuộc.
- `--share-qr-size: 192px` trong `components.css`; `tokens.test.ts` khóa khai báo và utility `size-(--share-qr-size)`.
- `next.config.ts` đặt `htmlLimitedBots` chép đủ regex mặc định rồi nối ba bot mới. `next-config.test.ts` (12 test) so phần đầu regex với `HTML_LIMITED_BOT_UA_RE` của Next, nên nâng Next mà danh sách mặc định đổi thì test đỏ.

## Verification
- Gate gốc: `pnpm lint` (0 lỗi, 1 cảnh báo cũ ở `day-tabs.test.tsx`), `pnpm typecheck`, `pnpm test` xanh (web 137 file / 2165 test; ui-web in cảnh báo "Timeout terminating forks worker" nhưng test pass).
- UA thật của Zalo chưa kiểm (RESEARCH A1): để UAT thủ công.

## Deviations
Không có.
