"use client";

// Accordion 4 khối của form tạo (D-62, D-63, D-65, D-72): chỉ một khối mở, khối đóng hiện tóm tắt hoặc lỗi.
// Component trình bày thuần: nhận `model` (giá trị, handler, lỗi, tóm tắt) và `refs` riêng (ESLint react-hooks/refs coi object
// chứa ref là ref). Mỗi `AccordionItem` có `value` cố định để khớp mảng `value` của Accordion (Base UI 1.8.0).
import type { Destination, InterestCode } from "@tripory/itinerary";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@tripory/ui-web";
import type { ReactNode, Ref } from "react";
import {
  BLOCK_TITLES,
  blockOfField,
  CREATE_BLOCKS,
  type CreateBlockId,
  type CreateTripField,
} from "./create-itinerary-blocks";
import { DestinationBlock, type DestinationBlockHandle } from "./destination-block";
import { InterestsBlock } from "./interests-block";
import { TripDatesBlock } from "./trip-dates-block";
import { TripNameBlock } from "./trip-name-block";

export type CreateAccordionModel = Readonly<{
  openBlocks: readonly CreateBlockId[];
  onOpenBlocksChange(next: readonly CreateBlockId[]): void;
  triggerRef(block: CreateBlockId): (element: HTMLButtonElement | null) => void;
  destinations: readonly Destination[];
  destination: Readonly<{ value: string | null; onValueChange(slug: string): void; onCommit(slug: string): void }>;
  title: Readonly<{ value: string; onChange(value: string): void; onBlur(): void }>;
  dates: Readonly<{
    start: Readonly<{ value: string; onChange(value: string): void }>;
    days: Readonly<{ value: number; onChange(value: number): void }>;
  }>;
  interests: Readonly<{ value: readonly InterestCode[]; onChange(next: readonly InterestCode[]): void }>;
  errors: Readonly<Partial<Record<CreateTripField, string>>>;
  summaries: Readonly<Record<CreateBlockId, string>>;
  disabled: boolean;
}>;

export type CreateAccordionRefs = Readonly<{
  destination: Ref<DestinationBlockHandle>;
  title: Ref<HTMLInputElement>;
  start: Ref<HTMLInputElement>;
  days: Ref<HTMLInputElement>;
  firstChip: Ref<HTMLButtonElement>;
}>;

const isBlockId = (value: string): value is CreateBlockId => (CREATE_BLOCKS as readonly string[]).includes(value);

const FIELD_ORDER: readonly CreateTripField[] = ["destinationCode", "title", "startDate", "dayCount", "interests"];

/** Lỗi của khối = lỗi của ô đầu tiên thuộc khối (theo thứ tự ô). */
function blockError(block: CreateBlockId, errors: CreateAccordionModel["errors"]): string | undefined {
  for (const field of FIELD_ORDER) {
    if (blockOfField[field] === block && errors[field] !== undefined) return errors[field];
  }
  return undefined;
}

function renderBlock(block: CreateBlockId, model: CreateAccordionModel, refs: CreateAccordionRefs): ReactNode {
  const { errors, disabled } = model;
  const blocks: Record<CreateBlockId, () => ReactNode> = {
    destination: () => (
      <DestinationBlock
        destinations={model.destinations}
        disabled={disabled}
        error={errors.destinationCode}
        handleRef={refs.destination}
        onCommit={model.destination.onCommit}
        onValueChange={model.destination.onValueChange}
        value={model.destination.value}
      />
    ),
    name: () => (
      <TripNameBlock
        disabled={disabled}
        error={errors.title}
        inputRef={refs.title}
        onBlur={model.title.onBlur}
        onChange={model.title.onChange}
        value={model.title.value}
      />
    ),
    dates: () => (
      <TripDatesBlock
        days={{ ...model.dates.days, error: errors.dayCount }}
        daysRef={refs.days}
        disabled={disabled}
        start={{ ...model.dates.start, error: errors.startDate }}
        startRef={refs.start}
      />
    ),
    interests: () => (
      <InterestsBlock
        disabled={disabled}
        error={errors.interests}
        firstChipRef={refs.firstChip}
        onChange={model.interests.onChange}
        value={model.interests.value}
      />
    ),
  };
  return blocks[block]();
}

export function CreateItineraryAccordion({
  model,
  refs,
}: Readonly<{ model: CreateAccordionModel; refs: CreateAccordionRefs }>) {
  return (
    <Accordion
      disabled={model.disabled}
      keepMounted
      multiple={false}
      onValueChange={(next) => model.onOpenBlocksChange(next.filter(isBlockId))}
      value={[...model.openBlocks]}
    >
      {CREATE_BLOCKS.map((block) => {
        const error = blockError(block, model.errors);
        return (
          <AccordionItem key={block} value={block}>
            <AccordionTrigger
              invalid={error !== undefined}
              ref={model.triggerRef(block)}
              summary={error ?? model.summaries[block]}
              title={BLOCK_TITLES[block]}
            />
            <AccordionPanel>{renderBlock(block, model, refs)}</AccordionPanel>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
