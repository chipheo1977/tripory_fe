"use client";

// Dòng báo cold start dưới nút submit (D-31): BE free tier có thể mất tới 30 giây để thức dậy, nên sau
// ~5 giây chưa xong thì giải thích cho người dùng. Vùng `aria-live="polite"` luôn có trong DOM và chỉ
// đổi nội dung: trình đọc màn hình chỉ thông báo thay đổi trong vùng đã tồn tại từ trước.
import { cn } from "@tripory/ui-web";
import { useEffect, useState } from "react";

/** Copy khóa của D-31, export để form và test dùng chung một chuỗi. */
export const COLD_START_MESSAGE = "Máy chủ đang khởi động, có thể mất tới 30 giây…";

const COLD_START_DELAY_MS = 5_000;

export type SubmitStatusProps = Readonly<{
  pending: boolean;
  /** Mặc định 5 giây (D-31), chỉnh được nếu thực tế cho thấy cần. */
  delayMs?: number;
}>;

export function SubmitStatus({ pending, delayMs = COLD_START_DELAY_MS }: SubmitStatusProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => {
      clearTimeout(timer);
      // Lần gửi sau đếm lại từ đầu. Dòng chữ biến mất ngay khi `pending` về false nhờ điều kiện render.
      setSlow(false);
    };
  }, [pending, delayMs]);

  const visible = pending && slow;

  // Margin chỉ có khi có chữ: dòng rỗng không được chiếm chỗ dưới nút (UI-SPEC §Layout).
  return (
    <p aria-live="polite" className={cn("text-center text-label text-muted", visible && "mt-stack-sm")}>
      {visible ? COLD_START_MESSAGE : ""}
    </p>
  );
}
