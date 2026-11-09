---
phase: 04-itinerary-crud-editor
fixed_at: 2026-11-05T00:00:00Z
review_path: .planning/phases/04-itinerary-crud-editor/04-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 4: Code Review Fix Report

**Source review:** `.planning/phases/04-itinerary-crud-editor/04-REVIEW.md`
**Scope:** Critical + Warning (không có `--all`; 6 finding Info không xử lý)

**Summary:**
- Findings in scope: 3
- Fixed: 2
- Skipped: 1

## Fixed Issues

### WR-01: `focusRequest` không bao giờ bị xóa, nên cướp focus khi quay lại tab Tổng quan

**Files modified:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx`
**Commit:** 86d62aa
**Applied fix:** Thêm `appliedFocusRequest` (ref) ghi nhớ yêu cầu focus đã áp; effect chỉ focus nút "Thêm điểm đến" khi gặp yêu cầu mới. Không dùng `setFocusRequest(null)` trong effect như gợi ý của review vì rule `react-hooks/set-state-in-effect` báo lỗi lint; ref cho cùng hành vi mà không đổi rule. Trạng thái `focusRequest` vẫn giữ nguyên cho `WaypointList`. Status: fixed: requires human verification (lỗi hành vi focus; nên thử tay: xóa điểm cuối của Ngày 1, rồi chuyển sang tab Tổng quan và quay lại).

### WR-03: `useMapCamera` chỉ dùng tham số khởi tạo nhưng bị tính lại mỗi lần render

**Files modified:** `apps/web/src/modules/itinerary/ui/use-map-camera.ts`, `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx`
**Commit:** 5f1cb1b
**Applied fix:** `useMapCamera` nhận `MapFitTarget | (() => MapFitTarget)` và khởi tạo state lười; `LoadedEditor` truyền hàm. Thêm JSDoc nói rõ tham số chỉ đọc lúc mount. Tương thích ngược với test hiện có (vẫn truyền giá trị).

## Skipped Issues

### WR-02: `LoadedEditor` gộp quá nhiều mối quan tâm (SOLID-S/I)

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:241-540`
**Reason:** Tách thành `useWaypointFeedback`, `useEditorMapInteraction`, `useEditorDialogs` là refactor lớn trên khoảng 16 state, 2 timer và nhiều handler chéo nhau (`handleAdded` đụng highlight, focus, camera và recentDay cùng lúc). Không thể đảm bảo không đổi hành vi bằng kiểm tra theo từng finding, nên bỏ qua theo yêu cầu. Nên làm thành một plan riêng có test.
**Original issue:** Component khoảng 300 dòng, 16 `useState`, vượt ngưỡng 150 dòng của coding-rules (S, I).

---

_Verification:_ `pnpm lint`, `pnpm typecheck`, `pnpm test` từ gốc repo đều pass (web 1995 test). Working tree còn các thay đổi chưa commit của việc khác (map-attribution, trip-map, use-attribution-disclosure), không thuộc phiên này.
