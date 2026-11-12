"use client";

// Tải ảnh QR dạng PNG (D-14): vẽ ma trận lên canvas 512×512 rồi tải bằng một thẻ <a download>. Mọi nhánh lỗi trả "failed",
// không ném, để hộp chia sẻ hiện câu báo lỗi thay vì vỡ UI (T-05-32). Hook là chỗ duy nhất đụng `document`/`URL`.
import { useCallback } from "react";
import { paintQr, QR_IMAGE_PIXELS } from "./qr-canvas";
import { qrMatrix } from "./qr-matrix";

export type QrDownloadResult = "ok" | "failed";
type QrDownloadInput = Readonly<{ url: string; fileName: string }>;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    // Safari cần thẻ nằm trong tài liệu mới chạy `click()`.
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function downloadQrPng({ url, fileName }: QrDownloadInput): Promise<QrDownloadResult> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = QR_IMAGE_PIXELS;
    canvas.height = QR_IMAGE_PIXELS;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return "failed";
    paintQr(ctx, qrMatrix(url), QR_IMAGE_PIXELS);
    const blob = await canvasToBlob(canvas);
    if (blob === null) return "failed";
    saveBlob(blob, fileName);
    return "ok";
  } catch {
    return "failed";
  }
}

export function useQrDownload(): Readonly<{ download(input: QrDownloadInput): Promise<QrDownloadResult> }> {
  const download = useCallback((input: QrDownloadInput) => downloadQrPng(input), []);
  return { download };
}
