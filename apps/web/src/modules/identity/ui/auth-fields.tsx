"use client";

// Mảnh dùng chung của ba form auth (login, register, đổi mật khẩu): vỏ một ô và ô mật khẩu controlled.
// Chỉ là phần ghép giao diện với React Hook Form, không có luật nghiệp vụ hay copy riêng của form nào.
import { FormField, FormFieldDescription, FormFieldError, FormFieldLabel, PasswordInput } from "@tripory/ui-web";
import { useId, type ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { PasswordChecklist } from "./password-checklist";
import type { ChecklistItem } from "./password-rule-copy";

export type AuthFieldProps = Readonly<{
  label: string;
  /** Message lỗi của ô (Zod hoặc BE); `undefined` = ô hợp lệ. */
  error: string | undefined;
  /** Có thì hiện checklist ngay dưới control, trước lỗi (UI-SPEC §PasswordChecklist). */
  checklist?: readonly ChecklistItem[];
  children: ReactNode;
}>;

// `match` bắt buộc vì lỗi do React Hook Form giữ, Base UI không tự biết ô đang lỗi.
export function AuthField({ label, error, checklist, children }: AuthFieldProps) {
  const descriptionId = useId();
  const checklistId = useId();
  const invalid = error !== undefined;
  return (
    <FormField invalid={invalid}>
      <FormFieldLabel>{label}</FormFieldLabel>
      {children}
      {checklist ? (
        // `div` thay `p` mặc định: checklist có `div` và `ul` bên trong. Base UI tự nối id này vào
        // `aria-describedby` của control, nên ô mật khẩu đọc được checklist.
        <FormFieldDescription id={descriptionId} render={<div />}>
          <PasswordChecklist id={checklistId} items={checklist} />
        </FormFieldDescription>
      ) : null}
      <FormFieldError match={invalid}>{error}</FormFieldError>
    </FormField>
  );
}

export type ControlledPasswordInputProps<T extends FieldValues> = Readonly<{
  control: Control<T>;
  name: Path<T>;
  autoComplete: "current-password" | "new-password";
  readOnly: boolean;
  /** Chạy sau khi giá trị đã vào form, dùng để kiểm lại ô phụ thuộc (nhập lại, rule so với mật khẩu cũ). */
  onAfterChange?: () => void;
}>;

// Controlled (không `register`) để khi form xóa ô thì `PasswordInput` thấy `value === ""` và tự ẩn lại (T-03-04).
export function ControlledPasswordInput<T extends FieldValues>({
  control,
  name,
  autoComplete,
  readOnly,
  onAfterChange,
}: ControlledPasswordInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <PasswordInput
          aria-required="true"
          autoComplete={autoComplete}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(event) => {
            field.onChange(event);
            onAfterChange?.();
          }}
          readOnly={readOnly}
          ref={field.ref}
          value={typeof field.value === "string" ? field.value : ""}
        />
      )}
    />
  );
}
