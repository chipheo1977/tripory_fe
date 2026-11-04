"use client";

// Lớp 1 của lưới ảnh bìa (D-85): radiogroup CHỈ chứa các radio ảnh. Nút X và nút thêm là anh em đứng sau nhóm này trong DOM
// (lớp 2, `cover-tile-actions.tsx`), nên không có control lồng trong radio. `Radio value` là URL (không phải vị trí) để
// nhãn không đổi nghĩa khi dồn vị trí sau khi xóa.
import { Icon, Radio, RadioGroup } from "@tripory/ui-web";
import { Check, ImageOff } from "lucide-react";
import { useState } from "react";

function ThumbFailed() {
  return (
    <div className="flex size-full items-center justify-center bg-surface-muted">
      <Icon className="text-subtle" icon={ImageOff} size="md" />
      <span className="sr-only">Không tải được ảnh từ link này</span>
    </div>
  );
}

const isHttps = (url: string): boolean => url.startsWith("https://");

function CoverThumb({ url }: Readonly<{ url: string }>) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!isHttps(url) || failedUrl === url) return <ThumbFailed />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL ngoài do người dùng nhập, không đi qua image optimizer (D-25).
    <img
      alt=""
      className="size-full object-cover"
      loading="lazy"
      onError={() => setFailedUrl(url)}
      referrerPolicy="no-referrer"
      src={url}
    />
  );
}

export type CoverChoiceGroupProps = Readonly<{
  visible: boolean;
  images: readonly string[];
  selectedIndex: number | null;
  onSelect(index: number): void;
  labelId: string;
  describedBy: string;
  invalid: boolean;
}>;

function radioLabel(index: number, selectedIndex: number | null): string {
  if (index === selectedIndex) return `Ảnh bìa ${index + 1}, đang hiển thị`;
  return `Chọn ảnh ${index + 1} làm ảnh bìa`;
}

export function CoverChoiceGroup({
  visible,
  images,
  selectedIndex,
  onSelect,
  labelId,
  describedBy,
  invalid,
}: CoverChoiceGroupProps) {
  if (!visible) return null;
  return (
    <RadioGroup
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      aria-labelledby={labelId}
      className="col-start-1 row-start-1 grid grid-cols-2 gap-inline-sm sm:grid-cols-3"
      onValueChange={(next) => {
        const index = images.indexOf(String(next));
        if (index >= 0) onSelect(index);
      }}
      value={images[selectedIndex ?? -1] ?? null}
    >
      {images.map((url, index) => (
        <Radio
          aria-label={radioLabel(index, selectedIndex)}
          className="group relative aspect-(--itinerary-cover-ratio) overflow-hidden rounded-container border border-border data-checked:border-primary data-checked:ring-2 data-checked:ring-primary"
          key={url}
          value={url}
        >
          <CoverThumb url={url} />
          <span
            aria-hidden="true"
            className="absolute left-inline-xs top-inline-xs hidden rounded-pill bg-primary p-inline-xs text-primary-foreground group-data-checked:inline-flex"
          >
            <Icon icon={Check} size="sm" />
          </span>
        </Radio>
      ))}
    </RadioGroup>
  );
}
