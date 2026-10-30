# UAT test 2: dialog "Lịch trình mới" kẹt ở "Đang tạo…" sau khi Back

## Trả lời ngắn

**Nguyên nhân gốc:** `CreateItineraryDialog` giữ dialog mở và khóa form bằng state cục bộ `navigating` sau khi tạo thành công, và comment trong code giả định "dialog mở cho tới khi trang đổi" tức là component sẽ unmount (`create-itinerary-dialog.tsx:44`, `:82`). Với `cacheComponents: true` (`apps/web/next.config.ts:5`), Next 16.4 không unmount trang danh sách khi đi tới editor mà ẩn nó bằng `<Activity mode="hidden">`, nên `createOpen` (ở `my-itineraries-view.tsx:104`) và `navigating` vẫn là `true` khi Back. `navigating` không bao giờ được reset, và `locked = isSubmitting || navigating` chặn mọi đường đóng dialog.

**Fix khuyến nghị:** thành công thì đóng dialog và reset form/`navigating` ngay trước `router.push` (Option A), kèm `key` để dialog mount mới mỗi lần mở nếu muốn chắc hơn.

## Bằng chứng

### 1. Luồng code
- `create-itinerary-dialog.tsx:44` `const [navigating, setNavigating] = useState(false)`. Comment dòng 43: "dialog vẫn mở cho tới khi trang đổi".
- `:50` `const locked = isSubmitting || navigating;`
- `:82-84` sau `mutateAsync` thành công: `setNavigating(true); markEnteredFromList(); router.push(...)`. Không có `onOpenChange(false)`, không có `setNavigating(false)` ở đâu cả (grep `setNavigating` chỉ có đúng một lần gọi, với `true`).
- `:88-91` `onSubmit` return sớm khi `navigating`.
- `:103-106` `handleOpenChange`: `if (!next && locked) return;` nên Esc, scrim, và mọi `onOpenChange(false)` đều bị nuốt.
- `:112-116` `handleOpenChangeComplete` (nơi duy nhất reset form/alert) chỉ chạy khi dialog đã đóng xong. Dialog không bao giờ đóng nên không bao giờ reset. `navigating` cũng không được reset ở đây.
- `:143` `<DialogClose disabled={locked}>Hủy</DialogClose>`: nút Hủy bị `disabled` thật. Đó là lý do "trông có mà không bấm được". `:144` `<Button loading={locked} loadingLabel="Đang tạo…">` luôn loading.
- `:146` `<SubmitStatus pending={locked} />`. `submit-status.tsx:27-34`: effect có `pending` true thì đặt timer 5 s rồi `setSlow(true)`. Khi Back, `pending` vẫn `true` nên dòng "Máy chủ đang khởi động…" hiện lại (effect chạy lại khi Activity hiện, `slow` đếm lại 5 s, hoặc giữ nguyên nếu đã set).
- `my-itineraries-view.tsx:104` `createOpen` là `useState(false)`, `:176` `openCreate` đặt true, `:238` `<CreateItineraryDialog open={createOpen} onOpenChange={setCreateOpen} />` luôn mounted trong view. Không ai đặt `createOpen` về false sau khi tạo xong, vì dialog tự chặn.

### 2. Activity
- `apps/web/node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:984`: với Cache Components, Next giữ route bằng `<Activity>` ở mode `"hidden"` thay vì unmount. Effect cleanup và chạy lại bình thường, nhưng `useState`, giá trị input và scroll không bị reset khi rời đi rồi quay lại. Dòng 992 trỏ tới guide "Preserving UI state across navigations".
- Hệ quả: `createOpen=true` và `navigating=true` sống sót trong list page bị ẩn. Khi Back (`router.back()` trong `itinerary-editor.tsx:56-58`, nhánh `enteredFromList()` bật bởi `markEnteredFromList()` ở dialog `:83`), trang được hiện lại với đúng state đó. Dialog là Base UI modal nên khi hiện lại nó vẫn là popup mở với trạng thái khóa.
- `router.back()` vs `router.push(MY_ITINERARIES)` (`itinerary-editor.tsx:51-61`): cả hai đều đưa về list. Nhánh `back()` dùng lại đúng entry bị ẩn nên giữ state. Nhánh `push` (mở editor trực tiếp) tạo/hiện trang mới nên không dính. Bug chỉ lộ ở đường vào từ danh sách.

### 3. Vì sao không có test bắt được
`create-itinerary-dialog.test.tsx:107-116` ("keeps the form locked after success…") khẳng định chính hành vi lỗi: sau `push`, input `readOnly`, nút `aria-busy`. Test mock `useRouter` và không mô phỏng việc component còn sống sau điều hướng. Test này phải đổi.

### 4. Các dialog/form khác
- `delete-itinerary-dialog.tsx`: **không dính**. `pending` được reset trong `finally` (`:61-64`), `onDeleted` + `onOpenChange(false)` đóng dialog ở `:66-67`. Ở editor, `itinerary-editor.tsx:379-383` gọi `onDeleted()` rồi `router.replace(MY_ITINERARIES)` sau khi dialog đã được yêu cầu đóng.
- Identity login/register forms: cần kiểm tra riêng (không đọc sâu ở đây). Chúng đi qua `session-effects.tsx:50-73` (`router.replace` ở effect, không có dialog). Nếu form giữ cờ "đang chuyển trang" tương tự `navigating` thì cùng rủi ro: khi đã đăng nhập, `AUTH_PAGES` bị redirect nên ít khi Back về trang đó, rủi ro thấp. Chưa xác nhận.
- `trip-info-dialog`, `waypoint-form-dialog`, `publish-dialog`, leave dialog (`leave-guard.tsx:105`): nằm trong editor, không có điều hướng sau thành công và không có cờ khóa kiểu `navigating`. Không có bằng chứng dính cùng bug; editor bị ẩn khi rời đi nhưng dialog của nó đóng bình thường trước đó. Chưa đọc từng file, nên cần rà nhanh `grep -n "setNavigating\|locked"` khi sửa.
- Kết luận: chỉ `CreateItineraryDialog` có mẫu "mở cho tới khi route đổi".

## Lưu ý D-11 / D-12
- D-11 (`04-CONTEXT.md:43`): tạo xong chuyển thẳng tới editor, không toast. Fix không được thêm toast hay chặn điều hướng.
- D-12 (`:44`): đang gửi thì nút "Đang tạo…" + spinner + `aria-busy` + chặn bấm lần hai; dòng cold start sau ~5 s. Fix giữ nguyên các điều này trong lúc **đang gửi**. Hủy bị khóa khi đang gửi theo UI-SPEC (`handleOpenChange` comment `:102`). Brief hỏi "Hủy hoạt động khi pending (abort/ignore)": D-12 không yêu cầu điều đó, và hiện hành vi khóa là có chủ đích; đổi sang cho hủy khi pending là thay đổi hành vi nhìn thấy được, cần người dùng duyệt.

## Đề xuất fix

### Option A (khuyến nghị): đóng và reset ngay khi thành công
Trong `handle` (`create-itinerary-dialog.tsx:82-84`), thay vì `setNavigating(true)` giữ mãi:
1. Gọi `markEnteredFromList()` và `router.push(...)`.
2. Đóng dialog bằng cách bỏ qua guard: gọi `onOpenChange(false)` từ callback sau khi đã clear `locked`, hoặc thêm cờ `closing` để `handleOpenChange` cho phép đóng.
3. Reset: `form.reset({ title: DEFAULT_TITLE })`, `setAlert(null)`, `setNavigating(false)`.

Vẫn chặn tạo lần hai nhờ `submittingRef` (đang true tới hết `handle`) và việc dialog đóng ngay. Dialog đóng trong lúc route chuyển nên người dùng thấy list mờ rồi editor; trên Back thấy list sạch. Nhược điểm: khoảng chờ chuyển trang (có thể tới vài giây ở mạng chậm) không còn spinner trên dialog; nếu muốn giữ phản hồi thì đóng dialog sau khi route đổi (Option B).

### Option B: giữ khóa tới khi route đổi, reset khi list hiện lại
Dùng `usePathname()` trong dialog (hoặc trong `MyItinerariesView`): effect chạy khi pathname quay về `/itineraries/mine` (Activity chạy lại effect khi hiện) thì `setNavigating(false); setCreateOpen(false); form.reset(...)`. Giữ spinner trong lúc chờ, nhưng phức tạp hơn và phụ thuộc hành vi effect của Activity. Hoặc đặt `key={createSession}` cho dialog, tăng khi Back, nhưng vẫn cần tín hiệu "đã quay lại".

**Khuyến nghị: Option A**, vì không phụ thuộc vòng đời Activity, ít code, và khớp D-11 (đi thẳng sang editor). Kết hợp thêm mount mới cho dialog mỗi lần mở (`{createOpen ? <CreateItineraryDialog key=... /> : null}` hoặc `key` tăng ở `openCreate`) nếu muốn phòng thủ.

### File cần sửa
- `apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx` (logic thành công, `handleOpenChange`).
- `apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx` (sửa test dòng 107-116 và thêm test mới).
- Có thể `my-itineraries-view.tsx` (`key`/`openCreate`), file này đang bị agent khác sửa nên cần phối hợp.

### Test tái hiện (Testing Library)
Render một wrapper có `open` state thật (`useState`) bọc `CreateItineraryDialog`, mock `push`. Click submit, đợi `push` được gọi. Không unmount; mô phỏng "Back" bằng cách để wrapper vẫn mounted rồi kiểm tra: (1) `screen.queryByRole("dialog")` là null (hoặc `waitFor` tới khi đóng), (2) mở lại dialog bằng cách đặt `open=true` thì nút submit không có `aria-busy`, input không `readOnly`, tiêu đề về "Chuyến đi mới", nút Hủy không `disabled`. Test hiện tại ở dòng 107 phải được viết lại thành "tạo lần hai không thể bắt đầu" mà không đòi dialog còn khóa.

### Tài liệu cần cập nhật
- `.planning/phases/04-itinerary-crud-editor/04-UAT.md`: test 2 chuyển thành `issue` với mô tả triệu chứng trên và tham chiếu báo cáo này.
- `04-UAT-CHECKLIST.md` mục B dòng 2: ghi lỗi, chạy lại sau khi fix.
- Không cần đổi D-11/D-12; nên ghi thêm chú thích rằng dialog phải tự đóng khi thành công vì route cũ được giữ bằng Activity (Pitfall mới cho `04-CONTEXT`/RESEARCH).

## Giới hạn
Không chạy app hay test, chỉ đọc code. Chưa đọc `trip-info-dialog`, `waypoint-form-dialog`, `publish-dialog` và các form identity một cách đầy đủ, nên mục 4 cho các file đó là suy luận từ grep, không phải xác nhận.
