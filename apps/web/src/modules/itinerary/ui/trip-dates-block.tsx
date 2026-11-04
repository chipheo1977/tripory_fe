"use client";

// Khối Thời gian (D-73, D-74, D-75): ngày khởi hành tùy chọn (không chặn ngày quá khứ, không có ngày kết thúc) và số ngày 1-30.
// Enter trong các ô không gửi form. Ref của hai ô truyền riêng (`startRef`, `daysRef`) để không lẫn vào đối tượng giá trị.
import { DAY_COUNT_MAX, DAY_COUNT_MIN } from "@tripory/itinerary";
import { Input, NumberStepper } from "@tripory/ui-web";
import type { KeyboardEvent, Ref } from "react";
import { FormFieldRow } from "./form-field-row";

type Field<T> = Readonly<{
  value: T;
  onChange(value: T): void;
  error?: string;
}>;

export type TripDatesBlockProps = Readonly<{
  start: Field<string>;
  days: Field<number>;
  disabled: boolean;
  startRef?: Ref<HTMLInputElement>;
  daysRef?: Ref<HTMLInputElement>;
}>;

// Chỉ chặn Enter trong ô nhập: nút −/+ vẫn kích hoạt được bằng Enter.
const preventEnter = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
};

const DAY_LABELS = { decrement: "Giảm số ngày", increment: "Tăng số ngày", suffix: "ngày" } as const;

export function TripDatesBlock({ start, days, disabled, startRef, daysRef }: TripDatesBlockProps) {
  return (
    <div className="flex flex-col gap-stack-md" onKeyDown={preventEnter}>
      <FormFieldRow description="Không bắt buộc." error={start.error} label="Ngày khởi hành">
        <Input
          clearLabel="Xóa Ngày khởi hành"
          onValueChange={start.onChange}
          readOnly={disabled}
          ref={startRef}
          size="lg"
          type="date"
          value={start.value}
        />
      </FormFieldRow>
      <FormFieldRow description="Từ 1 đến 30 ngày." error={days.error} label="Số ngày">
        <NumberStepper
          disabled={disabled}
          inputRef={daysRef}
          invalid={days.error !== undefined}
          labels={DAY_LABELS}
          max={DAY_COUNT_MAX}
          min={DAY_COUNT_MIN}
          onValueChange={days.onChange}
          value={days.value}
        />
      </FormFieldRow>
    </div>
  );
}
