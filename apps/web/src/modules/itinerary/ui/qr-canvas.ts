// Vẽ ma trận QR lên canvas để tải PNG (D-14, UI-SPEC §Hộp chia sẻ: 512×512, module #000000 trên nền #FFFFFF).
// Nhận một "bút" tối thiểu thay vì `CanvasRenderingContext2D` để test được mà không cần canvas thật.
import type { QrMatrix } from "./qr-matrix";

export const QR_IMAGE_PIXELS = 512;
export const QR_DARK = "#000000";
export const QR_LIGHT = "#FFFFFF";

export type QrPaintTarget = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
};

/**
 * Tô nền sáng toàn ảnh rồi mỗi module tối một ô. Toạ độ ô làm tròn xuống, cạnh làm tròn lên: không để khe hở giữa các ô
 * khi `pixels` không chia hết cho số module (ô cuối có thể vượt vài điểm ảnh, canvas cắt phần thừa).
 */
export function paintQr(ctx: QrPaintTarget, matrix: QrMatrix, pixels: number): void {
  ctx.fillStyle = QR_LIGHT;
  ctx.fillRect(0, 0, pixels, pixels);
  ctx.fillStyle = QR_DARK;
  const cell = pixels / matrix.size;
  const side = Math.ceil(cell);
  matrix.rows.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), side, side);
    });
  });
}
