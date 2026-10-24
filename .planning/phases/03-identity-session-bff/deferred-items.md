# Phase 3: Deferred Items

Các phát hiện ngoài phạm vi plan đang chạy. Không sửa trong plan, ghi lại để xử lý sau.

## 03-02

### `token-guard.test.ts` dễ quá thời gian khi máy bận (có sẵn từ Phase 1)

- **Test:** `packages/ui-web/src/token-guard.test.ts` > "không có Storybook hoặc route showcase".
- **Hiện tượng:** `Error: Test timed out in 5000ms` khi chạy nhiều suite `@tripory/ui-web` song song (3 tiến trình cùng lúc). Chạy tuần tự 5 lần liên tiếp đều xanh (180 test), nên chỉ là flake do tải.
- **Nguyên nhân khả dĩ:** test gọi `productionFiles(path.join(repoRoot, 'apps'))` quét đệ quy toàn bộ `apps/` (gồm `node_modules`, `.next`) bằng `readdirSync({ recursive: true })`, tốn thời gian khi đĩa hoặc CPU bận.
- **Không do plan 03-02:** file này và hàm quét không bị plan chạm tới.
- **Gợi ý:** nâng timeout cho test đó hoặc loại `node_modules`/`.next` khỏi lần quét `apps/`.
