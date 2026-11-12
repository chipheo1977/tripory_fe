"use client";

// Ô link chỉ đọc + "Sao chép link" + "Chia sẻ qua ứng dụng" của hộp chia sẻ (D-13, UI-SPEC §Hộp chia sẻ). Không toast: phản hồi
// là nhãn nút đổi trong 2000ms và một dòng `aria-live="polite"` luôn có trong DOM (không chồng thông báo trong hộp). Clipboard
// lỗi thì chọn sẵn chữ trong ô, focus ô và báo chép tay. Mọi API trình duyệt nằm trong hook (`useCopyLink`, `useNativeShare`).
import { Button, cn, FormField, FormFieldLabel, Input } from "@tripory/ui-web";
import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type Ref } from "react";
import { useCopyLink, type CopyStatus } from "./use-copy-link";
import { useNativeShare } from "./use-native-share";

export type ShareLinkFieldProps = Readonly<{
  url: string;
  /** Tiêu đề lịch trình, đưa vào Web Share. */
  title: string;
  /** Nút nhận focus đầu tiên khi hộp mở (hộp truyền xuống làm `initialFocus`). */
  copyButtonRef: Ref<HTMLButtonElement>;
}>;

type Feedback = Readonly<{ tone: "info" | "danger"; text: string }>;

const FEEDBACK_TONE = { info: "text-muted", danger: "text-danger" } as const;

/** Dòng phản hồi theo trạng thái sao chép và kết quả Web Share; `null` khi chưa có gì để báo. */
export function feedbackOf(status: CopyStatus, shareFailed: boolean): Feedback | null {
  if (status === "copied") return { tone: "info", text: "Đã sao chép link" };
  if (status === "failed") return { tone: "danger", text: "Không sao chép được, hãy chép thủ công" };
  if (shareFailed) return { tone: "danger", text: "Không mở được ứng dụng chia sẻ. Hãy dùng Sao chép link." };
  return null;
}

const copyLabel = (status: CopyStatus): string => (status === "copied" ? "Đã sao chép link" : "Sao chép link");
const copyIcon = (status: CopyStatus) => (status === "copied" ? Check : Copy);

export function ShareLinkField({ url, title, copyButtonRef }: ShareLinkFieldProps) {
  const copy = useCopyLink();
  const nativeShare = useNativeShare();
  const [shareFailed, setShareFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedback = feedbackOf(copy.status, shareFailed);

  // Clipboard lỗi: chọn sẵn chữ trong ô để người dùng chép tay.
  useEffect(() => {
    if (copy.status !== "failed") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [copy.status]);

  async function handleCopy() {
    setShareFailed(false);
    await copy.copy(url);
  }

  async function handleNativeShare() {
    copy.reset();
    const outcome = await nativeShare.share({ title, url });
    setShareFailed(outcome === "failed");
  }

  return (
    <div className="flex flex-col gap-stack-md">
      <FormField className="gap-stack-sm">
        <FormFieldLabel>Link lịch trình</FormFieldLabel>
        <div className="flex w-full flex-col gap-stack-md sm:flex-row">
          <Input
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            ref={inputRef}
            value={url}
            wrapperClassName="min-w-0 sm:flex-1"
          />
          <Button
            className="w-full shrink-0 sm:w-auto"
            icon={copyIcon(copy.status)}
            onClick={() => void handleCopy()}
            ref={copyButtonRef}
            variant="primary"
          >
            {copyLabel(copy.status)}
          </Button>
        </div>
        <p aria-live="polite" className={cn("min-h-[1.5em] text-label font-regular", FEEDBACK_TONE[feedback?.tone ?? "info"])}>
          {feedback?.text}
        </p>
      </FormField>
      <Button
        className="w-full"
        icon={Share2}
        onClick={() => void handleNativeShare()}
        variant="secondary"
        visible={nativeShare.supported}
      >
        Chia sẻ qua ứng dụng
      </Button>
    </div>
  );
}
