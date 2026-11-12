"use client";

// Khối mã QR của hộp chia sẻ (D-14): QR sinh tại client, nút "Tải ảnh QR" (PNG). Lỗi tải hiện ở dòng `aria-live="polite"`
// luôn có trong DOM (không toast trong hộp). Không đụng API trình duyệt: tải ảnh nằm ở `useQrDownload`.
import { Button } from "@tripory/ui-web";
import { Download } from "lucide-react";
import { useId, useState } from "react";
import { QrCode } from "./qr-code";
import { qrFileName } from "./qr-file-name";
import { useQrDownload } from "./use-qr-download";

export type ShareQrSectionProps = Readonly<{
  url: string;
  title: string;
  itineraryId: string;
}>;

const DOWNLOAD_ERROR = "Không tải được ảnh QR. Hãy thử lại hoặc chụp màn hình mã QR.";

export function ShareQrSection({ url, title, itineraryId }: ShareQrSectionProps) {
  const headingId = useId();
  const { download } = useQrDownload();
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    const result = await download({ url, fileName: qrFileName(title, itineraryId) });
    if (result === "failed") setError(DOWNLOAD_ERROR);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-stack-md">
      <h3 className="text-label font-semibold text-text" id={headingId}>
        Mã QR
      </h3>
      <div className="flex flex-col items-center gap-stack-md">
        <div className="rounded-container border border-border bg-surface p-stack-md">
          <QrCode url={url} />
        </div>
        <p className="text-center text-label font-regular text-muted">Quét mã bằng camera điện thoại để mở lịch trình.</p>
        <Button icon={Download} onClick={() => void handleDownload()} variant="secondary">
          Tải ảnh QR
        </Button>
        <p aria-live="polite" className="min-h-[1.5em] text-center text-label font-regular text-danger">
          {error}
        </p>
      </div>
    </section>
  );
}
