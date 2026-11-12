// Ma trận QR của link chia sẻ (D-14). Sinh hoàn toàn tại client bằng `uqr` (zero dependency, pin cứng ở catalog), không gọi
// dịch vụ ngoài nên link không rời trình duyệt. Chỉ dùng `encode()`; KHÔNG dùng `renderSVG` (cần HTML thô, T-05-29).
import { encode } from "uqr";

export type QrMatrix = Readonly<{
  /** Số module mỗi cạnh, đã gồm viền. */
  size: number;
  /** `rows[y][x] === true` là module tối. */
  rows: readonly (readonly boolean[])[];
}>;

/** Sửa lỗi mức M, viền 2 module nằm TRONG ma trận. Thuần, chạy được ở server lẫn client. */
export function qrMatrix(text: string): QrMatrix {
  const result = encode(text, { ecc: "M", border: 2 });
  return { size: result.size, rows: result.data };
}
