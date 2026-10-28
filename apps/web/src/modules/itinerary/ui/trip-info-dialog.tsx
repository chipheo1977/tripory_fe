"use client";

// Dialog "Thông tin chuyến đi" (ITIN-03; D-17, D-24..D-26, D-36): sửa Tiêu đề, Mô tả, Ngày khởi hành, Ảnh bìa.
// Lưu xong đóng và không toast (D-24); lỗi BE gắn vào ô hoặc InlineAlert (`errorToast: false`).
//
// Ảnh bìa là link ngoài do người dùng nhập (D-25, T-04-39/40): chỉ `https://`, preview chỉ render khi qua `isHttpsUrl`
// (đã qua Zod), `referrerPolicy="no-referrer"`, KHÔNG dùng `next/image` nên không đi qua proxy của app. Ảnh lỗi
// tải vẫn lưu được vì host ảnh có thể chặn hotlink mà link vẫn đúng với người xem khác.
import { zodResolver } from "@hookform/resolvers/zod";
import type { Itinerary } from "@tripory/itinerary";
import { Button, cn, Icon, InlineAlert, Input, Skeleton, Textarea } from "@tripory/ui-web";
import { ImageOff, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SubmitStatus } from "@/components/submit-status";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { draftKey, draftStorage } from "./draft-storage";
import { mapMetadataError } from "./form-error-mapping";
import { FormFieldRow } from "./form-field-row";
import { isHttpsUrl, metadataSchema, toMetadataInput, type MetadataValues } from "./form-schemas";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import { useSaveStatusStore } from "./save-status";
import { useFormDraft } from "./use-form-draft";

const PREVIEW_DEBOUNCE_MS = 400;
const COVER_MAX = 500;

export type TripInfoDialogProps = Readonly<{
  itinerary: Itinerary;
  viewerId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Bản nháp đọc từ `sessionStorage` (D-36): điền vào form và hiện InlineAlert khôi phục. */
  restored?: MetadataValues | null;
  /** Báo form có thay đổi chưa lưu, để editor bật cảnh báo rời trang (`useEditorLeaveGuard.formDirty`). */
  onDirtyChange?: (dirty: boolean) => void;
}>;

const toValues = (source: Itinerary): MetadataValues => ({
  title: source.title,
  description: source.description ?? "",
  startDate: source.startDate ?? "",
  coverImageUrl: source.coverImageUrl ?? "",
});

type PreviewState = Readonly<{ url: string; outcome: "loaded" | "error" }>;

/** Khung preview (UI-SPEC §TripInfoDialog). `url` đã hợp lệ và đã qua debounce. */
function CoverPreview({ url }: { url: string }) {
  // Nhớ kết quả theo URL (mẫu "điều chỉnh state theo prop" của React): đổi URL tự quay về trạng thái đang tải.
  const [result, setResult] = useState<PreviewState | null>(null);
  const outcome = result?.url === url ? result.outcome : "loading";
  return (
    <div className="relative mt-stack-sm aspect-(--itinerary-cover-ratio) overflow-hidden rounded-container">
      {outcome === "error" ? (
        <div className="flex size-full flex-col items-center justify-center gap-stack-sm bg-surface-muted">
          <Icon className="text-subtle" icon={ImageOff} size="lg" />
          <p className="text-label text-muted">Không tải được ảnh từ link này</p>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL ngoài do người dùng nhập, không đi qua image optimizer (D-25). */}
          <img
            alt="Xem trước ảnh bìa"
            className={cn("size-full object-cover", outcome === "loading" && "invisible")}
            onError={() => setResult({ url, outcome: "error" })}
            onLoad={() => setResult({ url, outcome: "loaded" })}
            referrerPolicy="no-referrer"
            src={url}
          />
          {outcome === "loading" ? <Skeleton className="absolute inset-0 h-auto" variant="block" /> : null}
        </>
      )}
    </div>
  );
}

export function TripInfoDialog({
  itinerary: source,
  viewerId,
  open,
  onOpenChange,
  restored = null,
  onDirtyChange,
}: TripInfoDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const store = useSaveStatusStore();
  const form = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: toValues(source),
  });
  const update = itineraryHooks.useUpdateMetadata(source.id, {
    meta: { feedback: { errorToast: false } },
    onSuccess: () => store.markSaved(),
  });
  const [alert, setAlert] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const titleRef = useRef<HTMLElement | null>(null);

  const { errors, isSubmitting, isDirty } = form.formState;
  const locked = isSubmitting;
  const key = draftKey({ viewerId, itineraryId: source.id, kind: "metadata" });

  // Mở dialog là bắt đầu form mới từ dữ liệu hiện tại (hoặc bản nháp). Đọc qua ref để dữ liệu refetch trong lúc
  // dialog đang mở không ghi đè nội dung người dùng đang gõ.
  const latest = useRef({ source, restored });
  useEffect(() => {
    latest.current = { source, restored };
  });
  const { reset } = form;
  useEffect(() => {
    if (!open) return;
    const { source: current, restored: draft } = latest.current;
    reset(toValues(current));
    // Giữ giá trị mặc định là bản đang lưu ở BE để form tính "có thay đổi" đúng cho nội dung khôi phục.
    if (draft !== null) reset(draft, { keepDefaultValues: true });
  }, [open, reset]);

  useFormDraft({ key, getValues: form.getValues, enabled: open });

  const dirtyRef = useRef(onDirtyChange);
  useEffect(() => {
    dirtyRef.current = onDirtyChange;
  });
  useEffect(() => {
    dirtyRef.current?.(open && isDirty);
  }, [open, isDirty]);
  useEffect(
    () => () => {
      dirtyRef.current?.(false);
    },
    [],
  );

  // Preview: chỉ URL hợp lệ, trễ 400ms sau lần gõ cuối. URL không hợp lệ ẩn preview ngay (không chờ debounce).
  const coverValue = useWatch({ control: form.control, name: "coverImageUrl" }) ?? "";
  const trimmedCover = coverValue.trim();
  const validCover = isHttpsUrl(trimmedCover) && coverValue.length <= COVER_MAX ? trimmedCover : "";
  const [debouncedCover, setDebouncedCover] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCover(validCover), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [validCover]);
  const previewUrl = validCover !== "" && debouncedCover === validCover ? validCover : null;

  const startDateValue = useWatch({ control: form.control, name: "startDate" }) ?? "";

  const clearField = (name: "startDate" | "coverImageUrl") => {
    form.setValue(name, "", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    // Nút biến mất khi ô rỗng, trả focus về ô để không rơi về <body>.
    form.setFocus(name);
  };

  const handle = form.handleSubmit(async (values) => {
    setAlert(null);
    try {
      await update.mutateAsync(toMetadataInput(values));
    } catch (error) {
      const mapped = mapMetadataError(error);
      if (!mapped) return;
      const fields = Object.entries(mapped.fieldErrors) as [keyof MetadataValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        if (fields.length === 0) form.setFocus("title");
      }
      return;
    }
    draftStorage.remove(key);
    onOpenChange(false);
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Enter trong ô vẫn kích hoạt submit khi nút đang loading, nên chặn gọi lần hai bằng ref.
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    void handle(event).finally(() => {
      submittingRef.current = false;
    });
  };

  // Mọi đường đóng không lưu (Hủy, Esc, nút đóng Sheet) bỏ bản nháp (D-36); lưu thành công đã xóa ở `handle`.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (locked) return;
      draftStorage.remove(key);
      setAlert(null);
    }
    onOpenChange(next);
  };

  const { ref: registerTitleRef, ...titleField } = form.register("title");
  const descriptionField = form.register("description");
  const startDateField = form.register("startDate");
  const coverField = form.register("coverImageUrl");

  return (
    <ResponsiveFormSurface
      initialFocus={() => titleRef.current}
      locked={locked}
      onOpenChange={handleOpenChange}
      open={open}
      title="Thông tin chuyến đi"
      titleId={titleId}
    >
      <InlineAlert variant="info">{restored === null ? null : "Đã khôi phục nội dung chưa lưu"}</InlineAlert>
      <InlineAlert>{alert}</InlineAlert>
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onSubmit={onSubmit}>
        <FormFieldRow error={errors.title?.message} label="Tiêu đề" required>
          <Input
            {...titleField}
            autoComplete="off"
            readOnly={locked}
            ref={(element) => {
              registerTitleRef(element);
              titleRef.current = element;
            }}
            size="lg"
          />
        </FormFieldRow>

        <FormFieldRow controlId={descriptionId} error={errors.description?.message} label="Mô tả">
          <Textarea
            {...descriptionField}
            aria-invalid={errors.description === undefined ? undefined : true}
            id={descriptionId}
            readOnly={locked}
          />
        </FormFieldRow>

        <FormFieldRow error={errors.startDate?.message} label="Ngày khởi hành">
          <div className="flex w-full items-center gap-inline-sm">
            <Input {...startDateField} className="min-w-0 flex-1" readOnly={locked} size="lg" type="date" />
            {startDateValue === "" ? null : (
              <Button disabled={locked} onClick={() => clearField("startDate")} size="sm" type="button" variant="ghost">
                <Icon icon={X} size="sm" />
                Xóa ngày
              </Button>
            )}
          </div>
        </FormFieldRow>

        <div className="flex flex-col">
          <FormFieldRow
            description="Dán link ảnh bắt đầu bằng https://"
            error={errors.coverImageUrl?.message}
            label="Ảnh bìa"
          >
            <div className="flex w-full items-center gap-inline-sm">
              <Input
                {...coverField}
                autoComplete="off"
                className="min-w-0 flex-1"
                inputMode="url"
                readOnly={locked}
                size="lg"
                type="url"
              />
              {coverValue === "" ? null : (
                <Button
                  disabled={locked}
                  onClick={() => clearField("coverImageUrl")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Icon icon={X} size="sm" />
                  Xóa ảnh bìa
                </Button>
              )}
            </div>
          </FormFieldRow>
          {previewUrl === null ? null : <CoverPreview url={previewUrl} />}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
            <Button disabled={locked} onClick={() => handleOpenChange(false)} type="button" variant="secondary">
              Hủy
            </Button>
            <Button loading={locked} loadingLabel="Đang lưu…" type="submit">
              Lưu
            </Button>
          </div>
          <SubmitStatus pending={locked} />
        </div>
      </form>
    </ResponsiveFormSurface>
  );
}
