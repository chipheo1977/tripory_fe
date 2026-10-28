// Cờ "vào editor từ danh sách" (D-47): nút quay lại của editor dùng `router.back()` khi cờ bật, ngược lại
// `router.replace("/itineraries/mine")`. Cố ý là biến module thay vì `document.referrer`/`history.length`:
// hai thứ đó không đáng tin giữa các trình duyệt và khi mở thẳng link. Cờ mất khi reload, đúng ý (mở lại
// editor sau reload thì không còn "danh sách" ngay phía sau để quay về).
let fromList = false;

export function markEnteredFromList(): void {
  fromList = true;
}

export function enteredFromList(): boolean {
  return fromList;
}

export function clearEnteredFromList(): void {
  fromList = false;
}
