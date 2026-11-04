"use client";

// Khối Sở thích (D-70, D-71, D-94): 7 chip chọn nhiều, không bắt buộc. Nhãn và thứ tự đọc từ `INTERESTS` của domain.
import { INTERESTS, normalizeInterests, type InterestCode } from "@tripory/itinerary";
import { ToggleChip, ToggleChipGroup } from "@tripory/ui-web";
import { useId, type Ref } from "react";
import { BlockError } from "./block-error";

export type InterestsBlockProps = Readonly<{
  value: readonly InterestCode[];
  onChange(next: readonly InterestCode[]): void;
  error?: string;
  disabled: boolean;
  firstChipRef?: Ref<HTMLButtonElement>;
}>;

export function InterestsBlock({ value, onChange, error, disabled, firstChipRef }: InterestsBlockProps) {
  const descId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-stack-sm">
      <p className="text-label text-muted" id={descId}>
        Chọn một hoặc nhiều. Không bắt buộc.
      </p>
      <ToggleChipGroup
        aria-describedby={descId}
        aria-label="Sở thích"
        disabled={disabled}
        onValueChange={(next) => onChange(normalizeInterests(next))}
        value={[...value]}
      >
        {INTERESTS.map(({ code, label }, index) => (
          <ToggleChip key={code} ref={index === 0 ? firstChipRef : undefined} value={code}>
            {label}
          </ToggleChip>
        ))}
      </ToggleChipGroup>
      <BlockError id={errorId} message={error} />
    </div>
  );
}
