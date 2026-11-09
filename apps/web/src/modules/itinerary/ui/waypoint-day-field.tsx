"use client";

// Ô "Ngày" của form thêm điểm khi mở từ tab Tổng quan (D-138). Ẩn/hiện qua prop `visible` để form không rẽ nhánh JSX.
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from "@tripory/ui-web";
import { FormFieldRow } from "./form-field-row";

export type WaypointDayChoice = Readonly<{ dayNumber: number; subtitle: string | null }>;

export type WaypointDayFieldProps = Readonly<{
  visible: boolean;
  choices: readonly WaypointDayChoice[];
  value: number;
  onChange(dayNumber: number): void;
  disabled?: boolean;
}>;

/** "Ngày 3" hoặc "Ngày 3 · Phố cổ" khi ngày có phụ đề. */
export const dayChoiceLabel = (choice: WaypointDayChoice): string => {
  const base = `Ngày ${choice.dayNumber}`;
  if (choice.subtitle === null || choice.subtitle === "") return base;
  return `${base} · ${choice.subtitle}`;
};

export function WaypointDayField({ visible, choices, value, onChange, disabled = false }: WaypointDayFieldProps) {
  if (!visible) return null;
  const items = choices.map((choice) => ({ value: choice.dayNumber, label: dayChoiceLabel(choice) }));
  return (
    <FormFieldRow error={undefined} label="Ngày">
      <Select
        disabled={disabled}
        items={items}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        value={value}
      >
        <SelectTrigger aria-label="Ngày" size="lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <SelectItemText>{item.label}</SelectItemText>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldRow>
  );
}
