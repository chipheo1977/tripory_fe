---
phase: 04-itinerary-crud-editor
plan: 07
subsystem: itinerary-domain
tags: [domain, tdd, location-parser, google-maps, pure-function, wave-3]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-06: barrel domain của packages/itinerary, quy ước test bảng it.each"
provides:
  - "`parseLocationInput(raw): LocationParse` (union: coordinate | short-link | no-coordinate | out-of-range | empty | invalid)"
  - "`isShortMapsLink(raw)`, `formatCoordinate(c)` ('10.7769, 106.7009')"
  - "Type `LocationParse`, `LocationSource`, `PlaceHint` cho LocationField (04-17) và hook (04-09)"
affects: [04-09, 04-10, 04-17]

tech-stack:
  added: []
  patterns: [pure-parser-chain-of-null-returning-steps, string-only-url-parsing, safe-decode-try-catch]

key-files:
  created:
    - packages/itinerary/src/domain/location-input.ts
    - packages/itinerary/src/domain/location-input.test.ts
  modified:
    - packages/itinerary/src/domain/index.ts

key-decisions:
  - "Mỗi bước parse là một hàm nhỏ trả `LocationParse | null`, ghép bằng `??` theo đúng thứ tự ưu tiên của RESEARCH Pattern 7 (`!3d!4d` > path > query > `@`)."
  - "Link `http://maps.app.goo.gl/...` được nâng thành `https://` trong `short-link.url` vì route resolve (04-10) chỉ nhận https."
  - "Path Google Maps phải là `/maps` đúng hoặc bắt đầu `/maps/` (không chỉ bắt đầu bằng chuỗi `/maps`), nên `/mapsfoo` bị từ chối."
  - "Cắt tên/địa chỉ không để lại nửa cặp surrogate (emoji)."
  - "`formatCoordinate` đổi `-0.0000` thành `0.0000` cho số âm rất nhỏ."

patterns-established:
  - "Parse URL ở domain bằng regex/chuỗi thuần (không `URL`), `decodeURIComponent` luôn bọc try/catch, ký tự điều khiển bỏ bằng vòng `charCodeAt`."

requirements-completed: []

duration: ~15 min
completed: 2026-10-28
---

# Phase 4 Plan 7: Parser vị trí Summary

**`parseLocationInput` thuần cho ô "Vị trí": tọa độ trần, link Google Maps đầy đủ theo thứ tự ưu tiên Pattern 7, nhận diện link rút gọn, và `no-coordinate` kèm tên/địa chỉ gợi ý (D-48, D-49), có bảng 95 ca test gồm hai URL thật đã resolve**

> `requirements-completed` để trống, cùng cách làm với 04-02..04-06: ITIN-05/06 là hành vi người dùng, do các plan hook/UI sau (04-09, 04-17) giao. Plan này chỉ cung cấp hàm thuần.

## Commits

1. **Task 04-07-01 RED** — `2a2241a` `test(04-07): bảng mẫu vị trí`
2. **Task 04-07-02 GREEN** — `493189a` `feat(04-07): parse vị trí`

## Accomplishments

- **Tọa độ trần:** `10.7769, 106.7009`, `10.7769,106.7009`, `-33.8,151.2` nhận; `91, 10` → `out-of-range`; `10,7769 106,7009` và `10.7769` → `invalid`; chuỗi rỗng/trắng → `empty`.
- **Link rút gọn:** `maps.app.goo.gl/<id>` và `goo.gl/maps/<id>` (có hoặc không scheme, host hạ chữ thường) → `short-link`; `goo.gl/abc`, `maps.app.goo.gl.evil.com` → `invalid`.
- **Link đầy đủ:** `!3d!4d` (lấy cặp cuối) ưu tiên hơn `@`; `/maps/(place|search)/lat,+lng`; `query=`, `q=`, `ll=`, `destination=`, `center=` (giải `%2C` và `+`; `query=<tên>` không tính); `@lat,lng,15z`. Mọi nguồn có kiểm khoảng bằng `createWgs84Coordinate`.
- **Tên/địa chỉ (D-48, D-49):** link thật `Brandenburg+Gate,+Pariser+Platz,+10117+Berlin,+Germany` (đích của `maps.app.goo.gl/PJdcARfqULFnpENj7`) → `no-coordinate`, name `Brandenburg Gate`, address `Pariser Platz, 10117 Berlin, Germany`. Link thật Chợ Bến Thành → `coordinate` (10.7725, 106.698, `place-data`), name `Chợ Bến Thành`, address null.
- **Mitigation threat model:** T-04-14 (bỏ ký tự ≤ 0x1f/0x7f, cắt 200/500, có test), T-04-15 (`%` hỏng trong path và query không ném, có test), T-04-16 (host Google khớp chặt; test `evil.com`, `www.google.com@evil.com`, `google.com.evil.com`, có cổng, Google chỉ nằm trong query).

## Verification

- RED được xác nhận trước khi cài đặt: 72 fail / 23 pass với khung chỉ trả `invalid`.
- `pnpm --filter @tripory/itinerary test`: 7 file, 177 test xanh; `lint` và `typecheck` xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 62 file, 1002 test xanh.
- Acceptance: `new URL` không có trong `location-input.ts`; test chứa `29.996966,+68.748251` và `Brandenburg+Gate`. Không đụng `boundaries.mjs`.
- TDD gate: commit `test(04-07)` nằm trước `feat(04-07)`.

## Deviations from Plan

1. **[Rule 1 - Bug] Kiểu `it.each` ở `location-input.test.ts`.** Bảng hai cột (giá trị, lý do) làm `tsc` báo lỗi khi callback chỉ nhận một tham số; sửa thành nhận `(raw, reason)` và dùng `reason` làm thông điệp `expect`. Sửa trước commit GREEN nên nằm trong `493189a`, không phải commit RED. Cùng lỗi đã gặp ở 04-06.
2. **Chặt hơn plan một điểm:** host Google yêu cầu path `=== '/maps'` hoặc `startsWith('/maps/')` thay vì "bắt đầu `/maps`", để `/mapsfoo` không bị coi là Maps. Không ảnh hưởng ca nào trong bảng mẫu.
3. `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505` trên máy này; dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None. (Khung `location-input.ts` ở commit RED đã được thay bằng bản cài đặt thật.)

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- `location-input.ts`, `location-input.test.ts` tồn tại; `index.ts` có `export * from './location-input'`.
- Commit `2a2241a` (RED) và `493189a` (GREEN) có trong `git log`, RED nằm trước GREEN.
