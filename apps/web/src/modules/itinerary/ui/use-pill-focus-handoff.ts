"use client";

// Bàn giao focus khi viên thuốc chuyển chế độ đổi chỗ (UI-SPEC §Viên thuốc chuyển chế độ). Đổi chế độ, mở/đóng sheet hay
// qua breakpoint `lg` đều làm một viên thuốc bị gỡ và một viên thuốc khác được mount ở chỗ mới; nếu focus đang ở trong
// viên thuốc cũ thì nó rơi về `body`. Trình duyệt không bắn `blur` đáng tin khi phần tử bị gỡ, nên viên thuốc tự báo lúc
// bị gỡ (cleanup của layout effect chạy trước khi DOM bị tháo, nên `activeElement` còn nằm trong nó):
//   - đã có viên thuốc khác trong tài liệu (viên mới mount trước, viên cũ gỡ sau, ví dụ sheet đang chạy hiệu ứng đóng)
//     thì chuyển focus sang đoạn đang chọn của viên đó ngay;
//   - chưa có thì đặt cờ chờ trong HANDOFF_WINDOW_MS; viên thuốc mount tiếp theo mà focus đã rơi về `body` sẽ nhận focus.
// Không có cờ nào được giữ lâu: focus ở ngoài viên thuốc hoặc trang mới mount thì không bị cướp.
import { useEffect, useLayoutEffect, type RefObject } from "react";

const PILL_SELECTOR = "[data-view-mode-toggle]";
const SELECTED_SELECTOR = '[aria-pressed="true"]';
const HANDOFF_WINDOW_MS = 500;

let pendingHandoff = false;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function clearPending(): void {
  pendingHandoff = false;
  if (pendingTimer === null) return;
  clearTimeout(pendingTimer);
  pendingTimer = null;
}

function armPending(): void {
  clearPending();
  pendingHandoff = true;
  pendingTimer = setTimeout(clearPending, HANDOFF_WINDOW_MS);
}

/** Chỉ dùng trong test: đặt lại cờ chờ giữa các ca. */
export function resetPillFocusTracking(): void {
  clearPending();
}

function selectedSegmentOfAnotherPill(root: HTMLElement): HTMLElement | null {
  for (const pill of document.querySelectorAll<HTMLElement>(PILL_SELECTOR)) {
    if (root.contains(pill)) continue;
    const selected = pill.querySelector<HTMLElement>(SELECTED_SELECTOR);
    if (selected !== null) return selected;
  }
  return null;
}

function releaseFocusFrom(root: HTMLElement): void {
  if (!root.contains(document.activeElement)) return;
  const heir = selectedSegmentOfAnotherPill(root);
  if (heir === null) {
    armPending();
    return;
  }
  heir.focus();
}

function claimPendingFocus(root: HTMLElement): void {
  if (!pendingHandoff) return;
  const active = document.activeElement;
  const focusLost = active === null || active === document.body;
  if (!focusLost) return;
  clearPending();
  root.querySelector<HTMLElement>(SELECTED_SELECTOR)?.focus();
}

export function usePillFocusHandoff(ref: RefObject<HTMLElement | null>): void {
  // Nhả phải ở cleanup của layout effect: lúc đó DOM chưa bị tháo nên còn biết focus có nằm trong viên thuốc không.
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null) return undefined;
    return () => releaseFocusFrom(root);
  }, [ref]);

  // Nhận ở tick kế tiếp: focus ngay trong lúc mount làm vòng điều hướng bằng mũi tên của Base UI chưa kịp đăng ký đoạn
  // (đã đo: mũi tên không di chuyển focus), còn chờ một tick thì chạy đúng.
  useEffect(() => {
    const root = ref.current;
    if (root === null || !pendingHandoff) return undefined;
    const timer = setTimeout(() => claimPendingFocus(root), 0);
    return () => clearTimeout(timer);
  }, [ref]);
}
