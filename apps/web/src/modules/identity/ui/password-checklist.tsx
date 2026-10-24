// Checklist rule mật khẩu (D-26, D-27): luôn hiện từ lúc tải trang, trước khi nhập (AUTH-06).
//
// Component thuần theo props, không state: form tính `items` bằng `evaluatePasswordRules` rồi
// `buildChecklistItems`. Trạng thái không chỉ dựa vào màu: icon đổi hình và có tiền tố chữ ẩn cho trình
// đọc màn hình ("Đã đạt: " / "Chưa đạt: "). `key` theo `id` để mục giữ nguyên node khi chỉ đổi trạng thái,
// nhờ vậy vùng `aria-live` chỉ đọc lại mục vừa đổi chứ không đọc lại cả danh sách mỗi phím.
import { Icon, cn } from "@tripory/ui-web";
import { Circle, CircleCheck } from "lucide-react";
import type { ChecklistItem } from "./password-rule-copy";

export type PasswordChecklistProps = Readonly<{
  /** Đặt trên container để ô mật khẩu trỏ `aria-describedby` vào đây. */
  id: string;
  items: readonly ChecklistItem[];
  className?: string;
}>;

export function PasswordChecklist({ id, items, className }: PasswordChecklistProps) {
  return (
    <div className={cn("flex flex-col gap-inline-xs", className)} id={id}>
      <p className="text-label font-normal text-muted">Mật khẩu cần có:</p>
      <ul aria-live="polite" className="flex flex-col gap-inline-xs">
        {items.map((item) => (
          <li
            className={cn("flex items-start gap-inline-xs text-label", item.met ? "text-text" : "text-muted")}
            key={item.id}
          >
            <Icon className={item.met ? "text-success" : "text-muted"} icon={item.met ? CircleCheck : Circle} size="sm" />
            <span>
              <span className="sr-only">{item.met ? "Đã đạt: " : "Chưa đạt: "}</span>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
