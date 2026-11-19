// phím tắt gửi bình luận: Ctrl+Enter hoặc Cmd+Enter. component truyền `event.nativeEvent.isComposing` vào,
// hàm không đụng DOM. bộ gõ tiếng Việt Telex/VNI đang ghép dấu thì Enter chốt từ, không phải gửi (U-05).
export type ShortcutEventLike = Readonly<{ key: string; ctrlKey: boolean; metaKey: boolean; isComposing: boolean }>;

export function isSubmitShortcut(event: ShortcutEventLike): boolean {
  if (event.isComposing) return false;
  if (event.key !== "Enter") return false;
  return event.ctrlKey || event.metaKey;
}
