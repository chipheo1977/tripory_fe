"use client";

// Modal "Lịch trình mới" 4 khối accordion (ITIN-02; D-62..D-72, D-93..D-97): Điểm đến → Tên chuyến đi → Thời gian → Sở thích,
// gửi MỘT request, thành công đi thẳng tới editor (không toast). Lỗi BE gắn vào ô hoặc InlineAlert (`errorToast: false`).
// Container chỉ nối hook với JSX: logic form ở `use-create-itinerary-form.ts`, khối đang mở ở `use-create-blocks.ts`.
import { INTERESTS, type InterestCode } from "@tripory/itinerary";
import { InlineAlert } from "@tripory/ui-web";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useWatch } from "react-hook-form";
import { destinationCatalog } from "@/composition/destination-catalog";
import { CreateItineraryAccordion, type CreateAccordionModel } from "./create-itinerary-accordion";
import {
  blockSummary,
  focusTargetOfBlock,
  type BlockErrors,
  type CreateBlockId,
  type CreateTripField,
} from "./create-itinerary-blocks";
import type { DestinationBlockHandle } from "./destination-block";
import { ResponsiveFormSurface, useIsWide } from "./responsive-form-surface";
import { StickyFormFooter } from "./sticky-form-footer";
import { useCreateBlocks } from "./use-create-blocks";
import { useCreateItineraryForm } from "./use-create-itinerary-form";

const DESTINATIONS = destinationCatalog.list();

export type CreateItineraryDialogProps = Readonly<{
  open: boolean;
  onOpenChange(open: boolean): void;
}>;

// Enter trong ô nhập không gửi form (D-68); Enter trên nút trigger/chip vẫn bật tắt.
const blockEnterSubmit = (event: KeyboardEvent<HTMLFormElement>): void => {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
};

const labelsOf = (codes: readonly string[]): readonly string[] =>
  INTERESTS.filter((interest) => codes.includes(interest.code)).map((interest) => interest.label);

export function CreateItineraryDialog({ open, onOpenChange }: CreateItineraryDialogProps) {
  const titleId = useId();
  const wide = useIsWide();
  const blocks = useCreateBlocks();
  const destinationRef = useRef<DestinationBlockHandle>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const daysInputRef = useRef<HTMLInputElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const focusTargets: Record<CreateTripField, () => void> = {
    destinationCode: () => destinationRef.current?.focusFirstOption(),
    title: () => titleInputRef.current?.focus(),
    startDate: () => startInputRef.current?.focus(),
    dayCount: () => daysInputRef.current?.focus(),
    interests: () => firstChipRef.current?.focus(),
  };
  const focusField = (block: CreateBlockId, errors: BlockErrors): void => focusTargets[focusTargetOfBlock(block, errors)]();

  const created = useCreateItineraryForm({
    onCreated: () => onOpenChange(false),
    onInvalid: (block, errors) => blocks.openAndFocus(block, () => focusField(block, errors)),
  });
  const { form } = created;
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const dayCount = useWatch({ control: form.control, name: "dayCount" });
  const interests = useWatch({ control: form.control, name: "interests" });
  const destinationCode = useWatch({ control: form.control, name: "destinationCode" });
  const formErrors = form.formState.errors;

  useEffect(() => {
    if (created.alert !== null) alertRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [created.alert]);

  const handleOpenChange = (next: boolean): void => {
    if (!next && created.locked) return;
    onOpenChange(next);
  };

  // Mở lại là form mới (D-95): dọn sau khi modal đã đóng hẳn để không chớp nội dung.
  const handleComplete = (isOpen: boolean): void => {
    if (isOpen) return;
    created.reset();
    blocks.reset();
  };

  const initialFocus = (): HTMLElement | null => {
    if (wide) return destinationRef.current?.getSearchElement() ?? null;
    return blocks.triggerElement("destination");
  };

  const summaryInput = {
    destinationName: created.destinationName,
    title: created.title.value,
    startDate,
    dayCount,
    interestLabels: labelsOf(interests),
  };

  const model: CreateAccordionModel = {
    openBlocks: blocks.openBlocks,
    onOpenBlocksChange: blocks.setOpenBlocks,
    triggerRef: blocks.triggerRef,
    destinations: DESTINATIONS,
    destination: {
      value: destinationCode,
      onValueChange: created.selectDestination,
      onCommit: (slug) => {
        created.selectDestination(slug);
        blocks.advanceFromDestination();
      },
    },
    title: created.title,
    dates: {
      start: { value: startDate, onChange: (value) => form.setValue("startDate", value, { shouldValidate: true }) },
      days: { value: dayCount, onChange: (value) => form.setValue("dayCount", value, { shouldValidate: true }) },
    },
    interests: {
      value: interests as readonly InterestCode[],
      onChange: (next) => form.setValue("interests", [...next]),
    },
    errors: {
      destinationCode: formErrors.destinationCode?.message,
      title: formErrors.title?.message,
      startDate: formErrors.startDate?.message,
      dayCount: formErrors.dayCount?.message,
      interests: formErrors.interests?.message,
    },
    summaries: {
      destination: blockSummary("destination", summaryInput),
      name: blockSummary("name", summaryInput),
      dates: blockSummary("dates", summaryInput),
      interests: blockSummary("interests", summaryInput),
    },
    disabled: created.locked,
  };

  return (
    <ResponsiveFormSurface
      fixedSnap
      initialFocus={initialFocus}
      locked={created.locked}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleComplete}
      open={open}
      title="Lịch trình mới"
      titleId={titleId}
    >
      <div ref={alertRef}>
        <InlineAlert>{created.alert}</InlineAlert>
      </div>
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onKeyDown={blockEnterSubmit} onSubmit={created.submit}>
        <CreateItineraryAccordion
          model={model}
          refs={{
            destination: destinationRef,
            title: titleInputRef,
            start: startInputRef,
            days: daysInputRef,
            firstChip: firstChipRef,
          }}
        />
        <StickyFormFooter onCancel={() => handleOpenChange(false)} pending={created.locked} />
      </form>
    </ResponsiveFormSurface>
  );
}
