"use client";

// Mã QR của link lịch trình (D-14, UI-SPEC §Hộp chia sẻ): vẽ bằng `<rect>`/`<path>` JSX từ ma trận, không HTML thô (T-05-29).
// Module `fill-text` trên nền `fill-surface` (token), cạnh `--share-qr-size`. Nhãn, mô tả và nút tải thuộc `ShareDialog`.
import { useMemo } from "react";
import { qrMatrix, type QrMatrix } from "./qr-matrix";

export type QrCodeProps = Readonly<{ url: string }>;

/** Gộp các module tối liền nhau trong một hàng thành một đoạn `M x y h len v 1 h -len z`. */
export function modulesPath(matrix: QrMatrix): string {
  const parts: string[] = [];
  matrix.rows.forEach((row, y) => {
    let start = -1;
    row.forEach((dark, x) => {
      if (dark && start === -1) start = x;
      if (!dark && start !== -1) {
        parts.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
        start = -1;
      }
    });
    if (start !== -1) parts.push(`M${start} ${y}h${row.length - start}v1h-${row.length - start}z`);
  });
  return parts.join("");
}

export function QrCode({ url }: QrCodeProps) {
  const matrix = useMemo(() => qrMatrix(url), [url]);
  const path = useMemo(() => modulesPath(matrix), [matrix]);
  return (
    <svg
      aria-label="Mã QR của link lịch trình"
      className="size-(--share-qr-size)"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${matrix.size} ${matrix.size}`}
    >
      <rect className="fill-surface" height={matrix.size} width={matrix.size} />
      <path className="fill-text" d={path} />
    </svg>
  );
}
