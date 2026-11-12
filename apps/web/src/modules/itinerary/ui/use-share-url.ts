"use client";

// URL tuyệt đối của trang công khai, dùng cho ô link, QR và Web Share (D-13). KHÔNG kèm `?view`. Lấy origin của trình
// duyệt nên đúng cả ở LAN/dev lẫn production mà không cần biến môi trường ở client (RESEARCH Pattern 5). Phía server
// (lúc render đầu) trả chuỗi rỗng; sau hydrate mới có giá trị, nên hộp chia sẻ chỉ dựng sau khi người dùng mở nó.
import { useSyncExternalStore } from "react";

const subscribeNever = (): (() => void) => () => undefined;
const readOrigin = (): string => window.location.origin;
const readServerOrigin = (): string => "";

export function useShareUrl(itineraryId: string): string {
  const origin = useSyncExternalStore(subscribeNever, readOrigin, readServerOrigin);
  return origin === "" ? "" : `${origin}/itineraries/${itineraryId}`;
}
