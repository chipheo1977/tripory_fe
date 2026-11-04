"use client";

// Khối Tên chuyến đi (D-68, D-93). Giá trị và cờ "đã sửa" do container tính từ `trip-title.ts`; khối chỉ hiển thị.
// Enter không gửi form và không chuyển khối.
import { Input } from "@tripory/ui-web";
import type { Ref } from "react";
import { FormFieldRow } from "./form-field-row";

export type TripNameBlockProps = Readonly<{
  value: string;
  onChange(value: string): void;
  onBlur(): void;
  error?: string;
  disabled: boolean;
  inputRef?: Ref<HTMLInputElement>;
}>;

export function TripNameBlock({ value, onChange, onBlur, error, disabled, inputRef }: TripNameBlockProps) {
  return (
    <FormFieldRow description="Tên tự đổi theo điểm đến cho tới khi bạn sửa." error={error} label="Tên chuyến đi" required>
      <Input
        autoComplete="off"
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        onValueChange={onChange}
        readOnly={disabled}
        ref={inputRef}
        size="lg"
        value={value}
      />
    </FormFieldRow>
  );
}
