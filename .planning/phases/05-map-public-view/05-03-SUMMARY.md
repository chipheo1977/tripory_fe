---
phase: 05-map-public-view
plan: 03
subsystem: itinerary-acl
tags: [acl, zod, author, be-dependencies, fixtures, wave-1]
provides:
  - "`ItineraryAuthor` + `Itinerary.author?` (domain), `itineraryAuthorDto.nullish()` (DTO), `toAuthor` (mapper)"
  - "Fixture app: `AUTHOR_JSON`, `DEFAULT_DICEBEAR_AVATAR`, `domain-itinerary-fixtures.ts` (`makeFxItinerary`, `makeFxWaypoint`, `FX_AUTHOR`)"
  - "`05-BE-DEPENDENCIES.md` (BE-05-01 trỏ tới `05-BE-GUIDE.md`)"
key-files:
  created:
    - apps/web/src/test/domain-itinerary-fixtures.ts
    - .planning/phases/05-map-public-view/05-BE-DEPENDENCIES.md
  modified:
    - packages/itinerary/src/domain/itinerary.ts
    - packages/itinerary/src/infrastructure/dto.ts
    - packages/itinerary/src/infrastructure/mappers.ts
    - packages/itinerary/src/infrastructure/dto.test.ts
    - packages/itinerary/src/infrastructure/mappers.test.ts
    - packages/itinerary/src/infrastructure/fixtures.ts
    - apps/web/src/test/be-itinerary-fixtures.ts
requirements-completed: [PUB-01]
completed: 2026-11-11
---
# Phase 5 Plan 03: ACL `author` và tài liệu phụ thuộc BE Summary

**FE parse `author` tùy chọn (thiếu hoặc hỏng thì ẩn khối tác giả), avatar dicebear mặc định thành `null`, không rò trường nhạy cảm.**

## Accomplishments
- `toAuthor` chỉ chép `id`, `displayName` (trim), `avatarUrl`; `id` sai GUID hoặc tên rỗng trả `undefined` thay vì ném; kết quả freeze; `toItinerary` chỉ thêm khóa `author` khi có.
- Avatar `https://api.dicebear.com/7.x/identicon/svg?seed=tripory` (kể cả có khoảng trắng bao quanh), rỗng, `null`, thiếu đều thành `null`; seed khác được giữ.
- Test mới: 5 ca ở `dto.test.ts`, 19 ca ở `mappers.test.ts` (package itinerary 617 thành 636 test).
- `05-BE-DEPENDENCIES.md` ghi theo chỉ đạo của người dùng: mục 6-11 của `04-BE-CONTRACT.md` đã deploy và `CoverImageBaseUrl` khớp là hai hạng mục đã được người dùng xác nhận ngày 2026-11-11 (không còn là việc phải làm, agent chưa kiểm độc lập); BE-05-01 trỏ tới `05-BE-GUIDE.md`; UAT F của Phase 4 và thiết bị cảm ứng thật vẫn còn mở.

## Verification
Gate gốc: `pnpm lint` (0 lỗi, 1 cảnh báo cũ), `pnpm typecheck`, `pnpm test` xanh (itinerary 28 file / 636 test; web 137 / 2165; ui-web 40 / 388, có cảnh báo "Timeout terminating forks worker" nhưng test pass).

## Deviations
Không có. `domain-itinerary-fixtures.ts` import `parseCalendarDate` từ `@tripory/itinerary` (barrel gốc, không phải `/http`).
