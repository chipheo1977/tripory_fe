---
phase: 04-itinerary-crud-editor
fixed_at: 2026-11-05T09:40:00+07:00
review_path: .planning/phases/04-itinerary-crud-editor/04-REVIEW-REOPENED.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 4 (mở lại): Báo cáo sửa lỗi review

**Nguồn:** `04-REVIEW-REOPENED.md` (chỉ 4 Warning; Info IN-01..IN-11 không đụng tới)
**Nhánh:** `phase_4`, không push.

## Kết quả theo phát hiện

### WR-01: Luật link ảnh bìa lỏng hơn BE; ảnh lỗi ở lại trong lưới — fixed
- **Commit:** `fb92fea` (gộp chung với WR-03, vì cùng sửa `cover-url-panel.tsx`)
- **File:** `packages/itinerary/src/domain/cover-url.ts` (mới), `domain/index.ts`, `apps/web/.../form-schemas.ts`, `cover-url-panel.tsx`, `use-trip-info-form.ts`
- **Cách sửa:** hàm thuần `isHttpsUrl` / `isValidCoverUrl` / `previewableCoverUrl` / `COVER_URL_MAX_LENGTH` ở tầng domain: `new URL` parse được, `protocol === 'https:'`, hostname khác rỗng, host đứng ngay sau `https://` (WHATWG bỏ qua `/` thừa nên `https:///a` vẫn parse được, phải chặn bằng regex riêng), không khoảng trắng hay ký tự điều khiển, độ dài đo sau trim. `form-schemas.ts` dùng lại và re-export `isHttpsUrl`; `validateCoverUrl` đo `trimmed`. `use-trip-info-form.ts` so theo tham chiếu `failure` thay vì chuỗi lỗi, nên cùng một thông báo lặp lại vẫn đặt lại lưới về danh sách đã lưu.
- **Test thêm:** `cover-url.test.ts` (4), `use-trip-info-form.test.tsx` (1, đã xác nhận đỏ trên mã cũ, xanh trên mã mới), bổ sung 2 ca vào `form-schemas.test.ts`.
- **Lưu ý:** các chỗ hiển thị dùng `startsWith("https://")` (IN-04) chưa đổi.

### WR-02: `flushSync` trong `useEffect` (form tạo) — fixed
- **Commit:** `09780af`
- **File:** `apps/web/.../use-create-blocks.ts`, `use-create-blocks.test.ts` (mới)
- **Cách sửa:** `openAndFocus` chỉ `setOpenBlocks([block])` và lưu một yêu cầu focus (đối tượng mới mỗi lần); một effect phụ thuộc yêu cầu đó chạy `focus()` sau commit, khi panel đã render. Khối đã mở sẵn vẫn focus mỗi lần. `advanceFromDestination` vẫn dùng `flushSync` vì được gọi từ handler sự kiện (hợp lệ). `create-itinerary-dialog.tsx` và `use-create-itinerary-form.ts` không cần đổi.
- **Test thêm:** 3 ca (focus chạy sau khi state khối đã commit; khối đã mở sẵn; không focus đồng bộ trong lúc gọi).
- **Giới hạn:** jsdom cho `focus()` bất kể ẩn/hiện, nên việc ô lỗi thật sự nhận focus trong Accordion Base UI (panel không `keepMounted`) chỉ kiểm được ở UAT trên trình duyệt.

### WR-03: Biểu thức trộn `&&` và `? :` — fixed
- **Commit:** `fb92fea` (chung với WR-01)
- **File:** `cover-url-panel.tsx`: `const valid = previewableCoverUrl(raw);` dùng hàm có tên, early return, cùng luật WR-01. Đã bỏ `COVER_MAX` riêng.

### WR-04: Tự lưu bị tạm dừng khi offline — fixed
- **Commit:** `fcfe3ee`, kèm `3c87732` (sửa kiểu của test)
- **File:** `apps/web/.../use-metadata-autosave.ts`, `use-metadata-autosave.test.tsx`
- **Cách sửa:** `networkMode: "always"` chỉ truyền vào `useUpdateMetadata` của tự lưu. Không đổi `query-client.ts` và không đổi `useWriteMutation`, nên mutation tạo, xóa, điểm, publish giữ nguyên mặc định `'online'`.
- **Test thêm:** 1 ca dùng `onlineManager.setOnline(false)` (cơ chế offline của TanStack Query; `navigator.onLine` không đủ trong jsdom). Đã xác nhận đỏ khi bỏ `networkMode`, xanh khi có.
- **Cần UAT:** hiện chỉ báo "Lỗi – Thử lại" khi tắt mạng thật.

## Xác minh sau sửa (chạy thật)

| Package | lint | typecheck | test | Baseline |
|---|---|---|---|---|
| `@tripory/itinerary` | đạt | đạt | 21 file, 427 test (+4) | 423 |
| `@tripory/ui-web` | không bị chạm | không bị chạm | 35 file, 334 test | 334 |
| `@tripory/web` | đạt | đạt | 112 file, 1729 test (+5) | 1724 |

Ghi chú: trong một lần chạy toàn bộ `@tripory/web`, `create-itinerary-dialog.test.tsx` đỏ 1 ca (33 s, nghi quá tải khi chạy song song với các lệnh khác); chạy riêng 26/26 xanh, và hai lần chạy toàn bộ sau đó đều 1729/1729 xanh. Typecheck từng đỏ do lỗi kiểu trong test mới của WR-04, đã sửa bằng commit riêng.

## Không làm
- Không sửa Info, không đụng `STATE.md`, `ROADMAP.md`, UAT, `packages/config`, repo BE; không push.
