// Đọc body JSON của Route Handler thành object thuần và chỉ lấy các field chuỗi đặt tên cứng. Dùng chung cho
// `/api/auth/*` và `/api/maps/resolve`. Không log: body có thể chứa mật khẩu hoặc link riêng tư.
import type { NextRequest } from "next/server";

/**
 * Đọc body request thành object JSON thuần. `null` khi không phải JSON, không có body, hoặc là mảng, số,
 * chuỗi, `null`: mọi thứ khác object đều là body sai hình dạng.
 */
export async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Chỉ lấy đúng các field chuỗi được đặt tên cứng. Không chuyển tiếp nguyên body của client lên BE: field lạ
 * (`role`, `isAdmin`, `confirmPassword`...) có thể chạm tới thuộc tính mà BE bind ngầm (mass-assignment,
 * T-03-32), và `confirmPassword` của form không có lý do rời server FE. Giá trị không phải chuỗi, hoặc thiếu
 * field, làm cả body bị từ chối. Chuỗi rỗng vẫn được qua để BE trả lỗi validate cho người dùng (D-19).
 * Không `trim`: khoảng trắng đầu/cuối là một phần của mật khẩu.
 */
export function pickStrings(
  source: Record<string, unknown> | null,
  keys: readonly string[],
): Record<string, string> | null {
  if (source === null) return null;

  const picked: Record<string, string> = {};

  for (const key of keys) {
    const value = source[key];

    if (typeof value !== "string") return null;

    picked[key] = value;
  }

  return picked;
}
