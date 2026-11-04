"use client";

// Khung "Link ảnh" mở ngay dưới lưới ảnh bìa (D-81, D-84): chỉ https, ≤ 500 ký tự, không trùng; preview không tải được
// vẫn cho thêm. Không modal chồng. Khung mang `data-escape-scope` và dừng Esc để Esc chỉ đóng khung, không đóng dialog.
import { Button, Input } from "@tripory/ui-web";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CoverPreview } from "./cover-preview";
import { FormFieldRow } from "./form-field-row";
import { isHttpsUrl, validateCoverUrl } from "./form-schemas";

const PREVIEW_DEBOUNCE_MS = 400;
const COVER_MAX = 500;

type PanelProps = Readonly<{
  panelId: string;
  existing: readonly string[];
  onAdd(url: string): void;
  onCancel(): void;
}>;

function PreviewSlot({ url }: Readonly<{ url: string }>) {
  if (url === "") return null;
  return <CoverPreview url={url} />;
}

function CoverUrlPanelBody({ panelId, existing, onAdd, onCancel }: PanelProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const trimmed = raw.trim();
  const valid = isHttpsUrl(trimmed) && raw.length <= COVER_MAX ? trimmed : "";

  useEffect(() => {
    const timer = setTimeout(() => setPreviewUrl(valid), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [valid]);

  useEffect(() => {
    inputRef.current?.focus();
    panelRef.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  const submit = () => {
    const message = validateCoverUrl(raw, existing);
    if (message !== null) {
      setError(message);
      return;
    }
    onAdd(trimmed);
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      className="flex flex-col gap-stack-sm rounded-container border border-border p-stack-md"
      data-cover-url-panel=""
      data-escape-scope=""
      id={panelId}
      ref={panelRef}
    >
      <FormFieldRow description="Dán link ảnh bắt đầu bằng https://" error={error ?? undefined} label="Link ảnh">
        <Input
          allowClear
          autoComplete="off"
          clearLabel="Xóa link ảnh"
          inputMode="url"
          onKeyDown={handleKey}
          onValueChange={(value) => {
            setRaw(value);
            setError(null);
          }}
          ref={inputRef}
          size="lg"
          type="url"
          value={raw}
        />
      </FormFieldRow>
      <PreviewSlot url={previewUrl} />
      <div className="flex justify-end gap-inline-sm">
        <Button onClick={onCancel} size="sm" type="button" variant="secondary">
          Hủy
        </Button>
        <Button className="min-w-touch" onClick={submit} size="sm" type="button">
          Thêm
        </Button>
      </div>
    </div>
  );
}

export function CoverUrlPanel({ visible, ...rest }: PanelProps & Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return <CoverUrlPanelBody {...rest} />;
}
