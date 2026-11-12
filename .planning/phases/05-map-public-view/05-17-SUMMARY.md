---
phase: 05-map-public-view
plan: 17
subsystem: editor-share-flow
tags: [editor, share, publish, toast-order, wave-4]
provides:
  - "`PublishDialog`: `successToast?` (mặc định true), `onClosed?`"
  - "`EditorHeader`: prop `share` + `ShareButton` thế chỗ nút Xuất bản khi đã xuất bản"
  - "`useShareAfterPublish`: xuất bản -> hộp chia sẻ tự mở -> toast sau khi đóng"
  - "`ItineraryEditor` ghép `ShareDialog showPublicLink`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/use-share-after-publish.ts
    - apps/web/src/modules/itinerary/ui/use-share-after-publish.test.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/publish-dialog.tsx
    - apps/web/src/modules/itinerary/ui/publish-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-header.tsx
    - apps/web/src/modules/itinerary/ui/editor-header.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
requirements-completed: [PUB-04]
completed: 2026-11-11
---
# Phase 5 Plan 17: Chia sẻ trong editor Summary

**Chủ xuất bản xong thì hộp chia sẻ tự mở; toast "Đã xuất bản lịch trình" chỉ phát một lần sau khi hộp đó đóng, rồi focus về nút "Chia sẻ lịch trình".**

## Accomplishments
- `PublishDialog` giữ hành vi Phase 4 khi không truyền prop mới (toast ngay); editor truyền `successToast={false}` và nghe `onClosed` (sau hoạt ảnh đóng) để hai hộp không tranh focus trap.
- Hook giữ hai cờ (`pendingAuto`, `autoOpened`): chỉ hộp tự mở mới tạo toast khi đóng; mở bằng nút "Chia sẻ" không toast; lỗi xuất bản không mở hộp, không toast.
- `ShareButton visible={itinerary.isPublic}` trong vùng thao tác bên phải của header: nháp không có nút chia sẻ (D-17).
- Test: +3 (publish-dialog), +3 (editor-header), +7 (hook), +4 (editor).

## Deviations (ca Phase 4 sửa có chủ đích)
- `editor-header.test.tsx`: ca "a published itinerary hides Xuất bản and shows only the title..." trước kỳ vọng không có chữ Chia sẻ; nay kỳ vọng có nút "Chia sẻ lịch trình" (D-15) và vẫn khóa khối tiêu đề chỉ có tiêu đề. Ca "a draft offers Xuất bản and no share action" giữ nguyên.
- `itinerary-editor.test.tsx`: ca "publishes after confirmation, then hides the button, shows the live note and focuses the 'i' button" được thay bằng luồng mới (hộp chia sẻ, toast sau khi đóng, focus về "Chia sẻ lịch trình"); xóa `focusMenuAfterPublish` trong editor vì focus do `onShareClosed` lo.
- Test chưa kiểm hiển thị thật trên điện thoại (Sheet modal chồng toast): UAT.

## Verification
Gate gốc: xem báo cáo wave 4.
