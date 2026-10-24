"use client";

// Form đổi mật khẩu (AUTH-06; D-17..D-19, D-26..D-31). Checklist 6 rule luôn hiện. Lỗi BE gắn đúng ô và giữ
// nguyên các ô còn lại. Thành công thì phiên kết thúc: `afterPasswordChanged` đưa về /login kèm toast (D-18).
import { zodResolver } from "@hookform/resolvers/zod";
import { CHANGE_PASSWORD_RULES, evaluatePasswordRules } from "@tripory/identity";
import { Button, InlineAlert, buttonVariants } from "@tripory/ui-web";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { identity } from "@/composition/identity.client";
import { AuthField, ControlledPasswordInput } from "./auth-fields";
import { AuthFormCard } from "./auth-form-card";
import { mapChangePasswordError } from "./form-error-mapping";
import { changePasswordSchema, type ChangePasswordValues } from "./form-schemas";
import { buildChecklistItems } from "./password-rule-copy";
import { SubmitStatus } from "./submit-status";
import { useSessionActions } from "./use-session-actions";

export function ChangePasswordForm() {
  const titleId = useId();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePassword = identity.useChangePassword({ meta: { feedback: { errorToast: false } } });
  const { afterPasswordChanged } = useSessionActions();
  const [alert, setAlert] = useState<string | null>(null);
  const [submitButton, setSubmitButton] = useState<HTMLElement | null>(null);
  const submittingRef = useRef(false);

  const { errors, isSubmitting } = form.formState;
  const newPassword = useWatch({ control: form.control, name: "newPassword" });
  const currentPassword = useWatch({ control: form.control, name: "currentPassword" });
  const checklist = buildChecklistItems(
    evaluatePasswordRules(CHANGE_PASSWORD_RULES, newPassword, currentPassword),
  );

  const handle = form.handleSubmit(async ({ currentPassword: current, newPassword: next }) => {
    setAlert(null);
    try {
      // Không gửi `confirmPassword` lên BE.
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
    } catch (error) {
      const mapped = mapChangePasswordError(error);
      if (!mapped) return;
      // D-19: giữ nguyên mọi ô, chỉ gắn lỗi và focus ô lỗi.
      const fields = Object.entries(mapped.fieldErrors) as [keyof ChangePasswordValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        if (fields.length === 0) submitButton?.focus();
      }
      return;
    }
    form.reset();
    await afterPasswordChanged();
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

  // Rule `differentFromCurrent` phụ thuộc mật khẩu hiện tại, nên ô mới đã chạm vào thì kiểm lại.
  const recheckNewPassword = () => {
    if (form.getFieldState("newPassword").isTouched) void form.trigger("newPassword");
  };
  const recheckConfirm = () => {
    if (form.getValues("confirmPassword") !== "") void form.trigger("confirmPassword");
  };

  // Link trông như nút phụ. Đang gửi thì vô hiệu: aria-disabled + chặn click, không điều hướng giữa chừng.
  const onCancelClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isSubmitting) event.preventDefault();
  };

  return (
    <AuthFormCard alert={<InlineAlert>{alert}</InlineAlert>} title="Đổi mật khẩu" titleId={titleId}>
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onSubmit={onSubmit}>
        <AuthField error={errors.currentPassword?.message} label="Mật khẩu hiện tại">
          <ControlledPasswordInput
            autoComplete="current-password"
            control={form.control}
            name="currentPassword"
            onAfterChange={recheckNewPassword}
            readOnly={isSubmitting}
          />
        </AuthField>
        <AuthField checklist={checklist} error={errors.newPassword?.message} label="Mật khẩu mới">
          <ControlledPasswordInput
            autoComplete="new-password"
            control={form.control}
            name="newPassword"
            onAfterChange={recheckConfirm}
            readOnly={isSubmitting}
          />
        </AuthField>
        <AuthField error={errors.confirmPassword?.message} label="Nhập lại mật khẩu">
          <ControlledPasswordInput
            autoComplete="new-password"
            control={form.control}
            name="confirmPassword"
            readOnly={isSubmitting}
          />
        </AuthField>
        <div className="mt-stack-sm flex flex-col">
          <Button
            className="w-full"
            loading={isSubmitting}
            loadingLabel="Đang lưu…"
            ref={setSubmitButton}
            size="lg"
            type="submit"
          >
            Đổi mật khẩu
          </Button>
          <SubmitStatus pending={isSubmitting} />
          <Link
            aria-disabled={isSubmitting || undefined}
            className={buttonVariants({ className: "mt-stack-sm w-full", size: "lg", variant: "secondary" })}
            data-disabled={isSubmitting ? "" : undefined}
            href="/itineraries/mine"
            onClick={onCancelClick}
            tabIndex={isSubmitting ? -1 : undefined}
          >
            Hủy
          </Link>
        </div>
      </form>
    </AuthFormCard>
  );
}
