# 04-01 — Hướng dẫn tự implement (human)

> Plan gốc: `04-01-PLAN.md`. Tài liệu này là brief của lead cho người tự code, mức gợi ý 1 (hướng đi, không đưa code).
> Quy trình: mỗi task theo TDD (đỏ → xanh → refactor), tự kiểm bằng lệnh bên dưới, nhắn "review 04-01 task N" để review, rồi commit.

## Mục tiêu

Sửa token để `text-muted`, `text-subtle`, `text-disabled` và `z-*` sinh ra CSS thật, rồi dựng guard test để lỗi này không quay lại.

### Vì sao

- Tailwind 4 sinh utility theo tên biến trong `@theme`. Theme hiện khai báo `--color-text-muted`, nên Tailwind sinh `text-text-muted`. Code lại viết `text-muted`, và class này **không có CSS**.
- `z-(--z-modal)` trỏ tới một biến không tồn tại, nên Dialog và Sheet không có z-index.
- Hậu quả: chữ phụ không mờ, nút disabled trông như đang bật, overlay có thể nằm dưới nội dung. Phase 4 cần nút "Xuất bản" `aria-disabled` (D-38) và header editor (D-16) hiển thị đúng.

### Tài liệu nên đọc trước

- `04-RESEARCH.md` §Pattern 17, §Pitfall 9
- `04-PATTERNS.md` §Token Wave 0
- `04-UI-SPEC.md` §Sizing mới, §Ghi chú từ UI checker

---

## Task 1: Alias token, 2 token sizing mới, test biên dịch

**File:** `packages/design-tokens/src/theme.css`, `packages/design-tokens/src/components.css`, `packages/design-tokens/src/tokens.test.ts`
**Đọc trước:** `theme.css`, `semantic.css`, `components.css`, `tokens.test.ts`

### Các bước (TDD)

1. **Đỏ.** Trong `tokens.test.ts`, thêm một `describe` mới. Dùng lại đúng hàm `compile(...)` của test biên dịch hiện có (khoảng dòng 188–200), gọi `compiler.build([...])` và kiểm:
   - `text-muted` / `text-subtle` / `text-disabled` sinh ra `color: var(--semantic-color-text-muted)` / `-subtle` / `-disabled`.
   - `bg-muted` **không** sinh rule nào. Tên test phải chứa chữ `bg-muted`, vì acceptance có grep chữ này.
   - `z-modal`, `z-sticky`, `z-dropdown`, `z-overlay`, `z-toast`, `z-base` sinh `z-index: var(--semantic-z-…)`, còn `z-50` **không** sinh rule.
   - `max-w-content-sm` sinh `max-width: var(--semantic-size-content-sm)`.
   - `aspect-(--itinerary-cover-ratio)` sinh `aspect-ratio: var(--itinerary-cover-ratio)`.

   Chạy test và xác nhận nó **đỏ**.
2. **Xanh.** Sửa các file:
   - `theme.css`: thêm `--z-index-*: initial;` vào khối reset ở đầu `@theme inline`, ngay sau `--breakpoint-*: initial;`.
   - `theme.css`: thêm 3 alias `--text-color-muted|subtle|disabled` ngay sau `--color-text-inverse`, kèm comment giải thích. **Giữ nguyên** các `--color-text-*` cũ.
   - `theme.css`: cuối `@theme inline`, thêm 6 alias `--z-index-{base,sticky,dropdown,overlay,modal,toast}` trỏ về `--semantic-z-*`.
   - `components.css`: thêm `--editor-timeline-width: 400px;` và `--itinerary-cover-ratio: 16 / 9;` vào `:root`, kèm comment (D-13 cột timeline, tỉ lệ ảnh bìa).
3. **Sửa test cũ sẽ vỡ:**
   - Thêm 2 khóa mới vào object `toEqual` của `components.css` (khoảng dòng 178–187).
   - Thêm `'z-index'` vào danh sách namespace reset mà test đang kiểm (khoảng dòng 231).

### Gợi ý (mức 1)

- Trước khi viết alias, tự trả lời: vì sao `--text-color-muted` cho ra `text-muted` mà **không** cho ra `bg-muted`, còn `--color-muted` thì cho ra cả hai? Gợi ý: xem utility `text-*` tra những namespace nào. RESEARCH Pattern 17 có câu trả lời.
- `--z-index-*: initial;` làm mất thang số mặc định (`z-50`…). Đây là cùng cách Phase 1 đã reset `--color-*`, `--spacing-*`…
- **Bẫy:** object `toEqual` của `components.css` khóa toàn bộ biến trong file. Thêm biến mà quên cập nhật chỗ này thì test cũ đỏ. Phase 3 từng dính đúng lỗi này với `--user-menu-name-max-width`.

### Tự kiểm

```powershell
pnpm --filter @tripory/design-tokens test
Select-String -Path packages/design-tokens/src/theme.css -Pattern '--text-color-muted: var(--semantic-color-text-muted);' -SimpleMatch
Select-String -Path packages/design-tokens/src/theme.css -Pattern '--z-index-modal: var(--semantic-z-modal);' -SimpleMatch
Select-String -Path packages/design-tokens/src/theme.css -Pattern '--z-index-*: initial;' -SimpleMatch
Select-String -Path packages/design-tokens/src/components.css -Pattern '--itinerary-cover-ratio: 16 / 9;' -SimpleMatch
```

Cả 4 lệnh `Select-String` đều phải có kết quả, và test phải xanh với một test có tên chứa `bg-muted`.

### Commit gợi ý

1. `test(04-01): add failing tests for text-color/z-index utilities`
2. `feat(04-01): alias text-color/z-index và token sizing editor`

---

## Task 2: Đổi `z-(--z-*)` thành `z-*`, sửa `max-w-(--size-content-sm)`, guard toàn repo

**File:** `packages/ui-web/src/molecules/{dialog,dropdown-menu,select,sheet,tooltip}.tsx`, `apps/web/src/components/{app-shell,app-header}.tsx`, `packages/design-tokens/src/tokens.test.ts`
**Đọc trước:** `packages/ui-web/src/token-guard.test.ts` (cách lấy `repoRoot`, `sourceRoots`, `productionFiles`), `tokens.test.ts`, `sheet.tsx`, `dialog.tsx`, `packages/config/eslint/boundaries.mjs` (rule `TOKEN_TEST` chỉ cho test token import `vitest`, `@tailwindcss/node`, `node:fs`, `node:path`, `node:url`)

### Các bước (TDD)

1. **Đỏ.** Trong `tokens.test.ts`, thêm `describe('guard: utility trong component có CSS và không trỏ biến mồ côi')`:
   - Gom class từ mọi `.tsx` không phải test trong `packages/ui-web/src/atoms`, `packages/ui-web/src/molecules`, `apps/web/src/components`, `apps/web/src/modules`, `apps/web/src/app`.
   - Đưa cả mảng token vào `compiler.build(...)`. Tailwind tự bỏ qua token không phải utility.
   - Lấy tập biến **được dùng** (`var(--x)`) trong CSS sinh ra, và tập biến **được khai báo** (`--x:`) trong `packages/design-tokens/src/*.css` cộng với khai báo có ngay trong output.
   - Bỏ qua tiền tố `--tw-` và `--drawer-`, và ghi rõ hai ngoại lệ này trong code.
   - Kỳ vọng danh sách biến thiếu là `[]`. Khi đỏ thì in danh sách đó ra.
   - Thêm **ca đột biến**: build với `theme.css` đã xóa dòng `--text-color-muted`, khẳng định `text-muted` không còn rule. Ca này chứng minh guard thật sự bắt được lỗi.

   Chạy test: lúc này nó phải **đỏ**, vì code vẫn còn `z-(--z-*)` và `max-w-(--size-content-sm)`.
2. **Xanh.** Thay đúng các chuỗi:
   - `z-(--z-modal)` → `z-modal`, `z-(--z-overlay)` → `z-overlay`, `z-(--z-dropdown)` → `z-dropdown`, `z-(--z-sticky)` → `z-sticky`.
   - Vị trí: dialog (3 chỗ), dropdown-menu, select, sheet (2 chỗ), tooltip, app-shell, app-header.
   - `sheet.tsx` (khoảng dòng 143): `max-w-(--size-content-sm)` → `max-w-content-sm`.
3. **Không sửa** `packages/ui-web/src/token-guard.test.ts` hiện có.

### Gợi ý (mức 1)

- Regex tách token nên giữ được ký tự `-`, `[` `]`, `(` `)`, `/`, `:`, `.`, `%`. Tách quá hẹp thì guard bỏ sót class có tham số, ví dụ `aspect-(--x)`.
- Nếu `compile` của `@tailwindcss/node` không nhận nội dung CSS nội tuyến cho ca đột biến, hãy tự ghép chuỗi: `@import "tailwindcss";` + nội dung `semantic.css` + `theme.css` đã sửa.
- **Bẫy:** biến `--drawer-*` do Base UI đặt lúc runtime, không khai báo trong token. Thiếu ngoại lệ này thì guard đỏ oan.

### Tự kiểm

```powershell
git grep -n "z-(--z-" -- packages apps                 # phải rỗng
git grep -n "size-content-sm)" -- packages/ui-web/src  # phải rỗng
Select-String -Path packages/design-tokens/src/tokens.test.ts -Pattern "--drawer-" -SimpleMatch  # có kết quả
pnpm --filter @tripory/design-tokens test
pnpm --filter @tripory/ui-web test
pnpm --filter @tripory/web test -- app-header app-shell
pnpm lint
pnpm typecheck
```

### Commit gợi ý

1. `test(04-01): guard var() mồ côi trong utility của component`
2. `fix(04-01): đổi z-(--z-*) sang z-* và sửa max-w-content-sm`

---

## Định nghĩa "xong" cho 04-01

- `text-muted` và `z-modal` có CSS thật. `bg-muted` và `z-50` không sinh rule.
- Repo không còn `z-(--z-` hay `max-w-(--size-content-sm)`.
- Guard xanh, và ca đột biến chứng minh guard bắt được lỗi.
- `pnpm lint` và `pnpm typecheck` xanh.
- Lead review xong, lead viết `04-01-SUMMARY.md` và cập nhật STATE/ROADMAP.

## Bảo mật (threat model của plan)

T-04-01 (Spoofing UI): nút `aria-disabled` trông như đang bật, hoặc dialog nằm dưới nội dung, có thể khiến người dùng bấm nhầm thao tác phá hủy. Plan này giảm rủi ro đó bằng alias token và guard `var()` mồ côi.
