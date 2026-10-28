---
phase: 04-itinerary-crud-editor
plan: 12
subsystem: itinerary-my-list-ui
tags: [list, infinite-scroll, tabs, cards, delete, intersection-observer, wave-7]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-09: hook `itinerary.useMyItineraries` (useInfiniteQuery) và `useDeleteItinerary`; 04-11: `CreateItineraryDialog`, `DeleteItineraryDialog`, `formatKm`, `formatStartDate`, `markEnteredFromList`; 04-03: route group `(shell)`; 04-05: `installFakeIntersectionObserver`"
provides:
  - "`CoverImage` (dùng lại ở tóm tắt editor): chỉ `https://`, `referrerPolicy=no-referrer`, lỗi tải/không có ảnh → nền dự phòng, đổi `src` thì thử lại"
  - "`ItineraryCard`: article, badge, link tiêu đề kéo giãn, meta, menu ⋯ Mở/Xóa, `titleLinkRef`"
  - "`MyItinerariesView` + `MyItinerariesSkeleton`: Tabs theo `?status=`, lưới 1/2/3 cột, cuộn vô hạn im lặng khi lỗi trang kế, empty/error theo tab, xóa từ thẻ + focus"
  - "`/itineraries/mine` dùng view thật trong Suspense (thay EmptyState tạm)"
affects: [04-14, 04-15, 04-16, 04-17]

tech-stack:
  added: []
  patterns:
    - "sentinel IntersectionObserver đăng ký một lần, trạng thái mới nhất đọc qua ref cập nhật bằng effect"
    - "thẻ vừa xóa ẩn ngay bằng tập `removedIds`, không chờ refetch danh sách"
    - "focus sau xóa đặt vào `pendingFocus` ref rồi áp dụng trong effect theo danh sách hiển thị"

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/cover-image.tsx
    - apps/web/src/modules/itinerary/ui/cover-image.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.test.tsx
    - apps/web/src/modules/itinerary/ui/my-itineraries-view.tsx
    - apps/web/src/modules/itinerary/ui/my-itineraries-view.test.tsx
  modified:
    - apps/web/src/app/(dashboard)/(shell)/itineraries/mine/page.tsx
    - apps/web/src/app/(dashboard)/(shell)/itineraries/mine/page.test.tsx

key-decisions:
  - "Thẻ dùng `<article>` với class tương đương `Card default` thay vì `Card` của ui-web, vì `Card` render `div` và không đa hình; plan yêu cầu `article`."
  - "Ngoài observer đăng ký một lần, thêm effect theo số thẻ đã nạp: nếu sentinel vẫn trong viewport sau khi một trang vừa nạp xong thì nạp tiếp (IntersectionObserver không báo lại khi giao nhau không đổi). Lỗi trang kế không đổi số thẻ nên không tạo vòng thử lại."
  - "Thẻ vừa xóa ẩn ngay (state `removedIds`) thay vì chờ `invalidateQueries`; focus tới thẻ kế tiếp → thẻ trước → CTA của EmptyState (tab Tất cả) → nút \"Tạo lịch trình\" đầu trang."

requirements-completed: [ITIN-01, ITIN-12]

duration: ~15 phút
completed: 2026-10-28
---

# Phase 4 Plan 12: Trang "Lịch trình của tôi" Summary

**Trang danh sách đầy đủ: Tabs Tất cả/Nháp/Đã xuất bản theo `?status=`, lưới thẻ có ảnh bìa, cuộn vô hạn không có nút "tải thêm" và im lặng khi trang kế lỗi, EmptyState riêng từng tab, xóa từ thẻ với focus chuyển sang thẻ lân cận**

> `requirements-completed` chỉ có ITIN-01 (danh sách có phân trang và lọc) và ITIN-12 (xóa sau xác nhận, làm được ngay từ thẻ). ITIN-02 (tạo nhanh rồi vào thẳng editor) và ITIN-09 (quãng đường theo ngày) chờ editor ở các plan sau, cùng cách làm với 04-02..04-13.

## Commits

1. **Task 04-12-01 RED** — `41e9999` `test(04-12): add failing tests for CoverImage and ItineraryCard`
2. **Task 04-12-01 GREEN** — `e4beed6` `feat(04-12): CoverImage va ItineraryCard cho danh sach lich trinh`
3. **Task 04-12-02 RED** — `011533b` `test(04-12): add failing tests for MyItinerariesView`
4. **Task 04-12-02 GREEN** — `35b8185` `feat(04-12): MyItinerariesView voi Tabs URL, luoi, cuon vo han va xoa tu the`
5. **Task 04-12-03** — `35d2abf` `feat(04-12): trang Lich trinh cua toi dung MyItinerariesView trong Suspense`

## Accomplishments

- **Task 1:** `CoverImage` chỉ render `img` khi `src` bắt đầu `https://` (`http:`, `javascript:`, `//` và chuỗi rỗng coi như không có ảnh), `alt=""`, `loading=lazy`, `decoding=async`, `referrerPolicy=no-referrer`; lỗi tải rơi về nền `bg-surface-muted` + icon, và nhớ `src` đã lỗi nên đổi `src` là thử lại. `ItineraryCard`: badge Nháp/Đã xuất bản, link tiêu đề tới `/itineraries/{id}/edit` (kéo giãn cả thẻ, gọi `markEnteredFromList`), meta "Khởi hành dd/MM/yyyy · x km" (bỏ phần thiếu, km 0 ẩn, thiếu cả hai thì không có hàng), không hiện số ngày/số điểm, menu ⋯ `Thao tác cho "{tên}"` với Mở (link) và Xóa (danger). 22 test.
- **Task 2:** `MyItinerariesView`: `?status=` lạ → Tất cả; đổi tab gọi `router.replace("?status=…", { scroll: false })`; 6 Skeleton + status "Đang tải lịch trình…"; lỗi trang đầu → `ErrorState` với "Thử lại" gọi `refetch`; EmptyState từng tab đúng copy, CTA chỉ ở tab Tất cả; sentinel `rootMargin: "0px 0px 400px 0px"`, 3 Skeleton + "Đang tải thêm lịch trình…" khi đang nạp; trang kế lỗi không render gì và chỉ thử lại khi sentinel ra rồi vào lại; hết trang không gọi; dedupe theo id. 23 test.
- **Task 3:** `page.tsx` bọc view trong `Suspense` (fallback `MyItinerariesSkeleton`), `metadata.title = "Lịch trình của tôi"`. Root layout đã có template `%s · Tripory`, nên không phải đổi root. 2 test.
- **Threat model:** T-04-33 (`no-referrer`, chỉ `https://`, có test), T-04-34 (tiêu đề chỉ ra qua text node, không HTML thô), T-04-35 (`parseStatusFilter` rơi về `all`, có test cho `xyz`).

## Verification

- `pnpm --filter @tripory/web exec vitest run cover-image itinerary-card my-itineraries-view "itineraries/mine"`: 47 test xanh (6 + 16 cho CoverImage/Card, 23 view, 2 page).
- `pnpm --filter @tripory/web build`: xanh, route `/itineraries/mine` là Partial Prerender.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 74 file, 1175 test xanh (trước plan: 1129). ESLint boundaries không đổi, không phụ thuộc mới.
- Acceptance: `referrerPolicy="no-referrer"` có trong `cover-image.tsx`; `daysCount|waypointsCount` không có trong `itinerary-card.tsx`; `rootMargin: "0px 0px 400px 0px"` có trong view; `Tải thêm` (phân biệt hoa thường) không có trong view; có 23 test view (≥ 10).

## Deviations from Plan

### Auto-fixed / Auto-added

**1. [Rule 1 - Bug] Cuộn vô hạn kẹt khi sentinel vẫn nằm trong viewport sau khi nạp xong một trang**
- **Found during:** Task 2 (thiết kế)
- **Issue:** Plan yêu cầu observer đăng ký một lần và chỉ gọi khi `isIntersecting`. IntersectionObserver chỉ báo khi giao nhau thay đổi, nên trên màn hình cao, sau trang 2 sentinel vẫn trong viewport và sẽ không bao giờ có thêm sự kiện, danh sách dừng ở trang 2.
- **Fix:** `visibleRef` ghi nhận giao nhau gần nhất; effect theo số thẻ đã nạp gọi `fetchNextPage` nếu sentinel còn nhìn thấy. Lỗi trang kế không đổi số thẻ nên không tạo vòng thử lại (test "stays silent…" khóa điều này).
- **Files modified:** my-itineraries-view.tsx
- **Commit:** 35b8185

**2. [Rule 3 - Blocking] `Card` của ui-web không render được `article`**
- **Found during:** Task 1
- **Issue:** `Card` default render `div`, không có prop `as`/`render`; plan yêu cầu `article`.
- **Fix:** dùng `<article>` với cùng class (`rounded-container border border-border bg-surface`, padding 0) và thêm hover/focus theo UI-SPEC. Không đụng `ui-web`.
- **Files modified:** itinerary-card.tsx
- **Commit:** e4beed6

**3. [Rule 2 - Missing critical functionality] Thẻ vừa xóa biến mất ngay**
- **Found during:** Task 2
- **Issue:** `useDeleteItinerary` chỉ `invalidateQueries(lists)`; thẻ sẽ còn hiện tới khi refetch xong, và focus có thể chuyển trước khi thẻ biến mất.
- **Fix:** state `removedIds` lọc thẻ ngay trong `onDeleted`; focus đặt vào `pendingFocus` rồi áp dụng khi danh sách hiển thị đổi (và lặp lại ở khung kế vì dialog xóa có thể trả focus).
- **Commit:** 35b8185

### Ghi chú TDD / test

- Task 1 và 2 đều có commit test (RED, import thất bại vì module chưa có) trước commit feat. Task 3 không `tdd`, một commit.
- Test "never shows day or waypoint counters" ban đầu fail vì tiêu đề mẫu "Sài Gòn 3 ngày" tự chứa "3 ngày"; đổi tiêu đề mẫu (lỗi của test, không phải của code).
- Một file rỗng `itinerary-card.tsx` ở gốc repo do lệnh PowerShell lỗi của chính tôi tạo ra đã được xóa, không vào commit nào.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- Sáu file tạo mới và hai file sửa đều tồn tại.
- Năm commit `41e9999`, `e4beed6`, `011533b`, `35b8185`, `35d2abf` có trong `git log` của `phase_4`.
