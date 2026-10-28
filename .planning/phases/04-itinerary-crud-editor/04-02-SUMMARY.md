---
phase: 04-itinerary-crud-editor
plan: 02
subsystem: infra
tags: [dnd-kit, pnpm-catalog, eslint-boundaries, api-client, keepalive, vitest, wave-0]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-01: token và guard Wave 0"
provides:
  - "Catalog pnpm có 4 gói `@dnd-kit/*`; `apps/web` khai báo dnd-kit và `@tripory/itinerary`; `packages/itinerary` khai báo dependency thật"
  - "Self-test ranh giới khóa itinerary (zod, dnd-kit, react, testing-library) và dnd-kit ở `modules/itinerary/ui`"
  - "`HttpRequest.keepalive?: boolean`, `createFetchHttpClient` chuyển thành `fetch` `keepalive: true`"
affects: [04-03, 04-04, 04-05, phase-04-itinerary]

tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/modifiers", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns: [catalog-pinned-deps, boundary-self-test, tdd-red-green]

key-files:
  created:
    - packages/itinerary/src/exports.test.ts
    - .planning/phases/04-itinerary-crud-editor/04-02-HUMAN.md
  modified:
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - apps/web/package.json
    - packages/itinerary/package.json
    - packages/config/test/boundaries.test.ts
    - packages/api-client/src/http-client.ts
    - packages/api-client/src/fetch-http-client.ts
    - packages/api-client/src/fetch-http-client.test.ts

key-decisions:
  - "Không sửa `boundaries.mjs`; chỉ thêm self-test để khóa luật hiện có."
  - "`keepalive` chỉ được thêm vào init của `fetch` khi caller bật, để request thường giữ nguyên hình dạng init."

patterns-established:
  - "Field mới của `HttpRequest` đi nguyên qua `withSessionRefresh` vì decorator chuyển nguyên object request."

requirements-completed: []

duration: không đo
completed: 2026-10-28
---

# Phase 4 Plan 2: Dependency và keepalive Wave 0 Summary

**Catalog pnpm có dnd-kit, `packages/itinerary` và `apps/web` khai báo dependency, 7 ca self-test khóa ranh giới itinerary, và `HttpRequest.keepalive` (TDD) cho lệnh gửi khi đóng trang**

> Task 1 do developer tự làm; Task 2 do agent được lead giao; Task 3 do agent làm theo TDD. Có lead review.
> Plan này là hạ tầng Wave 0 nên `requirements-completed` để trống: ITIN-07 và ITIN-08 sẽ do các plan sau giao.

## Commits

1. **Task 04-02-01** — `4f72bc4` `chore(04-02): thêm dnd-kit vào catalog và dependency cho packages/itinerary`
2. **Task 04-02-02** — `fd61d9a` `test(04-02): khóa ranh giới itinerary và dnd-kit bằng self-test`
3. **Task 04-02-03 RED** — `ffe41d6` `test(04-02): thêm test HttpRequest.keepalive`
4. **Task 04-02-03 GREEN** — `b55f1a3` `feat(04-02): thêm HttpRequest.keepalive cho api-client`

## Accomplishments

- `pnpm-workspace.yaml` thêm 4 gói dnd-kit vào catalog; `pnpm-lock.yaml` cập nhật, `pnpm install --frozen-lockfile` xanh.
- `apps/web/package.json` sắp lại `dependencies` theo thứ tự chữ cái, thêm dnd-kit và `@tripory/itinerary`.
- `exports.test.ts` của itinerary khóa hình dạng export.
- `boundaries.test.ts` thêm 4 ca xấu và 3 ca hợp lệ cho itinerary, 3 ca hợp lệ cho web (config: 114 test xanh); `boundaries.mjs` không đổi.
- `keepalive`: 3 test (có cờ, không cờ, đi qua `withSessionRefresh`); api-client 98 test xanh.

## Deviations from Plan

1. **Ba ca ranh giới của plan đã có sẵn nên không thêm trùng:** domain `Date.now` (~dòng 67), `react`/`react-dom` (~85), web `/http` trong `modules/ui` (~133).
2. **Ca mới 'web: composition/itinerary.client.ts import @tripory/itinerary/http' trùng một phần ca có sẵn 'web: composition import /http, /react và entry gốc'.** Giữ lại cho đúng lời văn plan.
3. **Thứ tự commit:** commit Task 2 (`fd61d9a`) nằm sau commit Task 1 (`4f72bc4`) về nội dung nhưng hai lệnh chạy gần nhau; lịch sử cuối cùng hiển thị `4f72bc4` trước `fd61d9a`, đúng thứ tự task.
4. **Ca (b) 'không keepalive' xanh ngay ở bước RED** vì hành vi hiện tại đã đúng; chỉ ca (a) và (c) đỏ lúc RED. Đây là test khóa hồi quy, không phải lỗi.
5. **`pnpm lint|typecheck|test` ở gốc crash** với exit `3221226505` (0xC0000409) khi `pnpm exec turbo` khởi chạy, không in lỗi. Chạy trực tiếp `node_modules\@turbo\windows-64\bin\turbo.exe run <task>` thì xanh. Đã thử đổi `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/itinerary/package.json` về bản cũ, vẫn crash, nên không do thay đổi của plan (nguyên nhân chưa xác định, nghi shim môi trường Windows).
6. Không có `package-lock.json` ở gốc repo khi bắt đầu nên không có gì để xóa.

## Issues Encountered

- Lỗi crash `pnpm` ở gốc như mục Deviations số 5.

## Next Phase Readiness

- Plan sau dùng được dnd-kit, `@tripory/itinerary` trong `apps/web`, và `keepalive` trong `HttpRequest`.
- Lưu ý khi dùng `keepalive`: giới hạn body khoảng 64 KB cho tổng các request keepalive đang bay; DELETE không có body nên không ảnh hưởng. `keepalive` không vượt qua kiểm tra Origin/phiên của BFF (T-04-04), request vẫn phải hợp lệ.
- Ready for 04-03.

---
*Phase: 04-itinerary-crud-editor*
*Completed: 2026-10-28*

## Self-Check

**Trạng thái: PASSED.**

- `pnpm install --frozen-lockfile`: PASSED.
- `pnpm --filter @tripory/itinerary test`: 1/1. `@tripory/config`: 114/114. `@tripory/api-client`: 98/98, lint và typecheck xanh.
- Toàn repo qua `turbo.exe run lint|typecheck|test`: 8/8 thành công cho cả ba (chạy trực tiếp binary vì `pnpm lint` ở gốc crash, xem Deviations số 5).
- Acceptance: `fetch-http-client.ts` có dòng `...(request.keepalive ? { keepalive: true } : {})`.
