"use client";

// Form đăng ký (AUTH-01; D-02, D-03, D-07, D-26, D-27, D-29..D-31). Cùng khuôn với LoginForm; khác ở checklist
// luôn hiện, ô nhập lại, và lỗi BE KHÔNG xóa mật khẩu (D-05 chỉ áp cho đăng nhập).
import { zodResolver } from "@hookform/resolvers/zod";
import {
  REGISTER_PASSWORD_RULES,
  evaluatePasswordRules,
  toSafeNextPath,
} from "@tripory/identity";
import { Button, InlineAlert, Input } from "@tripory/ui-web";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { identity } from "@/composition/identity.client";
import { AuthField, ControlledPasswordInput } from "./auth-fields";
import { AuthFormCard } from "./auth-form-card";
import { mapRegisterError } from "./form-error-mapping";
import { registerSchema, type RegisterValues } from "./form-schemas";
import { buildChecklistItems } from "./password-rule-copy";
import { SubmitStatus } from "./submit-status";
import { useSessionActions } from "./use-session-actions";

export function RegisterForm() {
  const titleId = useId();
  const rawNext = useSearchParams().get("next");
  const safeNext = toSafeNextPath(rawNext);
  const loginHref = safeNext === null ? "/login" : `/login?next=${encodeURIComponent(safeNext)}`;

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });
  const register = identity.useRegister({ meta: { feedback: { errorToast: false } } });
  const { afterSignIn } = useSessionActions();
  const [alert, setAlert] = useState<string | null>(null);
  const submittingRef = useRef(false);
  // State thay vì ref: callback của handleSubmit đọc nút này, React Compiler cấm đọc ref ngoài event handler trực tiếp.
  const [submitButton, setSubmitButton] = useState<HTMLElement | null>(null);

  const { errors, isSubmitting } = form.formState;
  // Checklist hiện từ lúc tải trang (AUTH-06); chỉ rule `minLength` cho đăng ký (D-27).
  const passwordValue = useWatch({ control: form.control, name: "password" });
  const checklist = buildChecklistItems(evaluatePasswordRules(REGISTER_PASSWORD_RULES, passwordValue));

  const handle = form.handleSubmit(async ({ fullName, email, password }) => {
    setAlert(null);
    let viewer;
    try {
      // Không gửi `confirmPassword` lên BE.
      viewer = await register.mutateAsync({ email, password, fullName });
    } catch (error) {
      const mapped = mapRegisterError(error);
      if (!mapped) return;
      const fields = Object.entries(mapped.fieldErrors) as [keyof RegisterValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        // Lỗi không gắn được vào ô: giữ focus ở nút gửi để người dùng thử lại ngay.
        if (fields.length === 0) submitButton?.focus();
      }
      return;
    }
    // Activity có thể giữ state form khi quay lại trang, nên xóa trước khi điều hướng.
    form.reset();
    afterSignIn({ viewer, next: rawNext, toast: "Tạo tài khoản thành công" });
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

  // Đổi mật khẩu chính thì ô nhập lại (đã có giá trị) phải được kiểm lại.
  const recheckConfirm = () => {
    if (form.getValues("confirmPassword") !== "") void form.trigger("confirmPassword");
  };

  return (
    <AuthFormCard
      alert={<InlineAlert>{alert}</InlineAlert>}
      footer={
        <p className="text-center text-body text-muted">
          Đã có tài khoản?{" "}
          <Link
            className="inline-flex min-h-touch items-center text-body font-semibold text-text underline underline-offset-4"
            href={loginHref}
          >
            Đăng nhập
          </Link>
        </p>
      }
      title="Tạo tài khoản"
      titleId={titleId}
    >
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onSubmit={onSubmit}>
        <AuthField error={errors.fullName?.message} label="Họ và tên">
          <Input
            {...form.register("fullName")}
            aria-required="true"
            autoComplete="name"
            readOnly={isSubmitting}
            size="lg"
            type="text"
          />
        </AuthField>
        <AuthField error={errors.email?.message} label="Email">
          <Input
            {...form.register("email")}
            aria-required="true"
            autoComplete="email"
            inputMode="email"
            readOnly={isSubmitting}
            size="lg"
            type="email"
          />
        </AuthField>
        <AuthField checklist={checklist} error={errors.password?.message} label="Mật khẩu">
          <ControlledPasswordInput
            autoComplete="new-password"
            control={form.control}
            name="password"
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
        <div className="mt-stack-sm">
          <Button
            className="w-full"
            loading={isSubmitting}
            loadingLabel="Đang tạo tài khoản…"
            ref={setSubmitButton}
            size="lg"
            type="submit"
          >
            Đăng ký
          </Button>
          <SubmitStatus pending={isSubmitting} />
        </div>
      </form>
    </AuthFormCard>
  );
}
