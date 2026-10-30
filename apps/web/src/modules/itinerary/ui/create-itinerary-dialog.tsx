"use client";

// Dialog "Lịch trình mới" (ITIN-02; D-09..D-12): một ô Tiêu đề điền sẵn và bôi đen, Enter gửi, thành công đi
// thẳng tới editor (không toast). Lỗi BE gắn vào ô hoặc InlineAlert trong dialog (`errorToast: false`).
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  InlineAlert,
  Input,
} from "@tripory/ui-web";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { SubmitStatus } from "@/components/submit-status";
import { itinerary } from "@/composition/itinerary.client";
import { markEnteredFromList } from "./entry-flag";
import { FormFieldRow } from "./form-field-row";
import { mapCreateItineraryError } from "./form-error-mapping";
import { createItinerarySchema, type CreateItineraryValues } from "./form-schemas";

const DEFAULT_TITLE = "Chuyến đi mới";

export type CreateItineraryDialogProps = Readonly<{
  open: boolean;
  onOpenChange(open: boolean): void;
}>;

export function CreateItineraryDialog({ open, onOpenChange }: CreateItineraryDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const form = useForm<CreateItineraryValues>({
    resolver: zodResolver(createItinerarySchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: { title: DEFAULT_TITLE },
  });
  const create = itinerary.useCreateItinerary({ meta: { feedback: { errorToast: false } } });
  const [alert, setAlert] = useState<string | null>(null);
  // Enter trong ô vẫn kích hoạt submit khi nút đang loading, nên chặn gọi lần hai bằng ref (D-12).
  const submittingRef = useRef(false);
  const inputRef = useRef<HTMLElement | null>(null);

  const { errors, isSubmitting } = form.formState;
  const locked = isSubmitting;
  const { ref: registerRef, ...titleField } = form.register("title");

  // Bôi đen sau khi Dialog đặt focus: `select()` trước rồi lặp lại ở frame kế, vì focus có thể đặt lại vùng chọn.
  const initialFocus = (): HTMLElement | null => {
    const input = inputRef.current;
    if (!(input instanceof HTMLInputElement)) return null;
    input.select();
    requestAnimationFrame(() => {
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    });
    return input;
  };

  const handle = form.handleSubmit(async (values) => {
    setAlert(null);
    let created;
    try {
      created = await create.mutateAsync({ title: values.title.trim() });
    } catch (error) {
      const mapped = mapCreateItineraryError(error);
      if (!mapped) return;
      const fields = Object.entries(mapped.fieldErrors) as [keyof CreateItineraryValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        if (fields.length === 0) form.setFocus("title");
      }
      return;
    }
    markEnteredFromList();
    router.push(`/itineraries/${created.id}/edit`);
    onOpenChange(false);
    form.reset({ title: DEFAULT_TITLE });
    setAlert(null);
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    void handle(event).finally(() => {
      submittingRef.current = false;
    });
  };

  // Đang gửi: Esc, scrim và "Hủy" đều không đóng được (UI-SPEC §Dialog tạo nhanh).
  const handleOpenChange = (next: boolean) => {
    if (!next && locked) return;
    onOpenChange(next);
  };

  // Mở lại dialog là form mới: dọn sau khi dialog đã đóng hẳn (xong animation) để không chớp nội dung.
  const handleOpenChangeComplete = (isOpen: boolean) => {
    if (isOpen) return;
    form.reset({ title: DEFAULT_TITLE });
    setAlert(null);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete} open={open}>
      <DialogContent initialFocus={initialFocus} size="sm">
        <DialogTitle id={titleId}>Lịch trình mới</DialogTitle>
        <InlineAlert>{alert}</InlineAlert>
        <form aria-labelledby={titleId} className="flex flex-col gap-stack-lg" noValidate onSubmit={onSubmit}>
          <FormFieldRow error={errors.title?.message} label="Tiêu đề">
            <Input
              {...titleField}
              autoComplete="off"
              readOnly={locked}
              ref={(element) => {
                registerRef(element);
                inputRef.current = element;
              }}
              size="lg"
            />
          </FormFieldRow>
          <div className="flex flex-col">
            <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
              <DialogClose disabled={locked}>Hủy</DialogClose>
              <Button loading={locked} loadingLabel="Đang tạo…" type="submit">
                Tạo lịch trình
              </Button>
            </div>
            <SubmitStatus pending={locked} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
