// Suy ra IP người dùng cuối cho giới hạn tốc độ của BE (D-35). Hàm thuần, không `server-only` để test được.
import { isIP } from "node:net";

/**
 * Header theo thứ tự ưu tiên. Cả ba đều do nền tảng hosting đặt:
 * - `x-vercel-forwarded-for`: Vercel đặt, luôn là IP công khai của client, không bị proxy phía trước ghi đè.
 * - `x-real-ip`: Vercel ghi đè, giống `x-forwarded-for`.
 * - `x-forwarded-for`: Vercel GHI ĐÈ giá trị client gửi và không chuyển tiếp IP ngoài (chống giả mạo IP).
 *
 * Nguồn: https://vercel.com/docs/headers/request-headers (mục `x-forwarded-for`, `x-real-ip`,
 * `x-vercel-forwarded-for`, kiểm lại ngày viết).
 *
 * Ngoài Vercel (dev local không proxy, self-host) các header này do client tự đặt được; chuyện đó chấp nhận
 * được vì BE chỉ tin IP này khi BFF gửi kèm `X-Bff-Secret`, và production chỉ chạy trên nền tảng ghi đè header.
 * Nếu đổi hosting phải kiểm lại proxy phía trước có ghi đè các header này hay không.
 */
const TRUSTED_IP_HEADERS = ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] as const;

/**
 * Lấy MỘT địa chỉ IPv4/IPv6 hợp lệ, hoặc `null`. Giá trị phải là đúng một IP: chuỗi dạng `a, b, c` (danh sách
 * proxy, hoặc client nhét thêm) bị bỏ, không cố đoán phần tử nào đáng tin. Header đầu tiên trong danh sách ưu
 * tiên mà không hợp lệ thì thử header kế tiếp.
 */
export function deriveClientIp(headers: Pick<Headers, "get">): string | null {
  for (const name of TRUSTED_IP_HEADERS) {
    const value = headers.get(name)?.trim();

    if (value !== undefined && value !== "" && isIP(value) !== 0) return value;
  }

  return null;
}
