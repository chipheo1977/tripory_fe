"use client";

// Vỏ một ô form của itinerary: nhãn, control, mô tả và lỗi. Chỉ là phần ghép giao diện với React Hook Form,
// không có luật nghiệp vụ hay copy riêng của form nào (theo `auth-fields.tsx`).
import { FormField, FormFieldDescription, FormFieldError, FormFieldLabel } from "@tripory/ui-web";
import type { ReactNode } from "react";

export type FormFieldRowProps = Readonly<{
  label: string;
  /** Message lỗi của ô (Zod hoặc BE); `undefined` = ô hợp lệ. */
  error: string | undefined;
  /** Hiện "(bắt buộc)" cạnh nhãn. Form một ô thì để mặc định. */
  required?: boolean;
  description?: ReactNode;
  /** Id của control khi nó KHÔNG phải ô Base UI (như `Textarea` thuần): nhãn cần `htmlFor` tường minh. */
  controlId?: string;
  children: ReactNode;
}>;

// `invalid` bắt buộc truyền vì lỗi do React Hook Form giữ, Base UI không tự biết ô đang lỗi.
export function FormFieldRow({ label, error, required = false, description, controlId, children }: FormFieldRowProps) {
  const invalid = error !== undefined;
  return (
    <FormField invalid={invalid}>
      {/* Chỉ truyền `htmlFor` khi có: giá trị `undefined` có thể đè lên liên kết tự động của Base UI. */}
      <FormFieldLabel {...(controlId === undefined ? {} : { htmlFor: controlId })} required={required}>
        {label}
      </FormFieldLabel>
      {children}
      {description === undefined ? null : <FormFieldDescription>{description}</FormFieldDescription>}
      <FormFieldError match={invalid}>{error}</FormFieldError>
    </FormField>
  );
}
