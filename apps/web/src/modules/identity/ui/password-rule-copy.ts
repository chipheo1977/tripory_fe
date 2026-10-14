// Copy tiếng Việt của rule mật khẩu. Nằm ở app, không ở `@tripory/identity`: package chỉ giữ rule
// dạng dữ liệu (id + predicate), lời văn là luật UX (tài liệu kiến trúc mục 9, UI-SPEC §PasswordChecklist).
import type { PasswordRuleId, PasswordRuleResult } from "@tripory/identity";

export type ChecklistItem = Readonly<{ id: PasswordRuleId; label: string; met: boolean }>;

// D-34: liệt kê đủ tập ký tự của BE để người dùng không gõ `-` rồi bị từ chối.
const FIXED_LABELS: Readonly<Record<Exclude<PasswordRuleId, "minLength">, string>> = {
  uppercase: "Có chữ in hoa (A–Z)",
  lowercase: "Có chữ thường (a–z)",
  digit: "Có chữ số (0–9)",
  special: "Có một trong các ký tự ! ? * @ # $ % ^ & + =",
  differentFromCurrent: "Khác mật khẩu hiện tại",
};

/** `min` chỉ có ở `minLength`; thiếu thì dùng câu trung tính thay vì đoán một con số. */
export function passwordRuleLabel(id: PasswordRuleId, min?: number): string {
  if (id === "minLength") return min === undefined ? "Đủ số ký tự tối thiểu" : `Ít nhất ${min} ký tự`;
  return FIXED_LABELS[id];
}

/** Kết quả `evaluatePasswordRules` → dữ liệu cho `PasswordChecklist`, giữ nguyên thứ tự rule. */
export function buildChecklistItems(results: readonly PasswordRuleResult[]): readonly ChecklistItem[] {
  return results.map((result) => ({
    id: result.id,
    label: passwordRuleLabel(result.id, result.min),
    met: result.met,
  }));
}
