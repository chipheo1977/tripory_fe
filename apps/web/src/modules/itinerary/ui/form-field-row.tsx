"use client";

// Vỏ một ô form của itinerary: nhãn, control, mô tả và lỗi. Chỉ là phần ghép giao diện với React Hook Form,
// không có luật nghiệp vụ hay copy riêng của form nào (theo `auth-fields.tsx`).
import { FormField, FormFieldDescription, FormFieldError, FormFieldLabel } from "@tripory/ui-web";
import type { ReactNode } from "react";

export type FormFieldRowProps = Readonly<{
  label: string;
  error: string | undefined;
  required?: boolean;
  description?: ReactNode;
  /** Id của control khi nó KHÔNG phải ô Base UI (như `Textarea` thuần): nhãn cần `htmlFor` tường minh. */
  controlId?: string;
  /** Nút đặt cùng hàng với nhãn, căn phải. Nằm sau control trong DOM nên Tab vẫn đi control trước. */
  labelAction?: ReactNode;
  children: ReactNode;
}>;

const ACTION_ROW_CLASS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-inline-sm [&>*:not(label,[data-label-action])]:col-span-full";
const ACTION_LABEL_CLASS = "col-start-1 row-start-1";

function LabelAction({ children }: Readonly<{ children: ReactNode }>) {
  if (children === undefined) return null;
  return (
    <div className="col-start-2 row-start-1 flex flex-wrap justify-end gap-inline-sm" data-label-action="">
      {children}
    </div>
  );
}

// invalid bắt buộc truyền vì lỗi do React Hook Form giữ, Base UI không tự biết ô đang lỗi.
export function FormFieldRow({ label, error, required = false, description, controlId, labelAction, children }: FormFieldRowProps) {
  const invalid = error !== undefined;
  const hasAction = labelAction !== undefined;
  const rowClass = hasAction ? ACTION_ROW_CLASS : undefined;
  const labelClass = hasAction ? ACTION_LABEL_CLASS : undefined;
  return (
    <FormField className={rowClass} invalid={invalid}>
      {/* Chỉ truyền `htmlFor` khi có: giá trị `undefined` có thể đè lên liên kết tự động của Base UI. */}
      <FormFieldLabel {...(controlId === undefined ? {} : { htmlFor: controlId })} className={labelClass} required={required}>
        {label}
      </FormFieldLabel>
      {children}
      <LabelAction>{labelAction}</LabelAction>
      {description === undefined ? null : <FormFieldDescription>{description}</FormFieldDescription>}
      <FormFieldError match={invalid}>{error}</FormFieldError>
    </FormField>
  );
}
