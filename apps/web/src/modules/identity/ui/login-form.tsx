"use client";

// Form đăng nhập (AUTH-02; D-01, D-05, D-07, D-29..D-31). Validate bằng Zod, lỗi BE hiện tại form
// (`errorToast: false`), thành công đi qua `useSessionActions().afterSignIn`.
import { zodResolver } from "@hookform/resolvers/zod";
import { toSafeNextPath, viewerDisplayName } from "@tripory/identity";
import { Button, Input, InlineAlert } from "@tripory/ui-web";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { identity } from "@/composition/identity.client";
import { AuthField, ControlledPasswordInput } from "./auth-fields";
import { AuthFormCard } from "./auth-form-card";
import { mapLoginError } from "./form-error-mapping";
import { loginSchema, type LoginValues } from "./form-schemas";
import { SubmitStatus } from "./submit-status";
import { useSessionActions } from "./use-session-actions";

export function LoginForm() {
  const titleId = useId();
  const rawNext = useSearchParams().get("next");
  // `next` không an toàn bị bỏ khỏi link chuyển trang (D-01, T-03-58).
  const safeNext = toSafeNextPath(rawNext);
  const registerHref = safeNext === null ? "/register" : `/register?next=${encodeURIComponent(safeNext)}`;

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: { email: "", password: "" },
  });
  const login = identity.useLogin({ meta: { feedback: { errorToast: false } } });
  const { afterSignIn } = useSessionActions();
  const [alert, setAlert] = useState<string | null>(null);
  // Enter trong ô vẫn kích hoạt submit khi nút đang loading, nên chặn gửi lần hai bằng ref (D-30, T-03-61).
  const submittingRef = useRef(false);

  const { errors, isSubmitting } = form.formState;

  const handle = form.handleSubmit(async (values) => {
    setAlert(null);
    let viewer;
    try {
      viewer = await login.mutateAsync(values);
    } catch (error) {
      const mapped = mapLoginError(error);
      if (!mapped) return;
      // D-05: giữ email, xóa mật khẩu (PasswordInput tự ẩn lại vì value về rỗng).
      form.resetField("password");
      const fields = Object.entries(mapped.fieldErrors) as [keyof LoginValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        if (fields.length === 0) form.setFocus("password");
      }
      return;
    }
    form.reset();
    afterSignIn({ viewer, next: rawNext, toast: `Chào mừng, ${viewerDisplayName(viewer)}` });
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

  return (
    <AuthFormCard
      alert={<InlineAlert>{alert}</InlineAlert>}
      footer={
        <p className="text-center text-body text-muted">
          Chưa có tài khoản?{" "}
          <Link
            className="inline-flex min-h-touch items-center text-body font-semibold text-text underline underline-offset-4"
            href={registerHref}
          >
            Đăng ký
          </Link>
        </p>
      }
      title="Đăng nhập"
      titleId={titleId}
    >
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onSubmit={onSubmit}>
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
        <AuthField error={errors.password?.message} label="Mật khẩu">
          <ControlledPasswordInput
            autoComplete="current-password"
            control={form.control}
            name="password"
            readOnly={isSubmitting}
          />
        </AuthField>
        <div className="mt-stack-sm">
          <Button className="w-full" loading={isSubmitting} loadingLabel="Đang đăng nhập…" size="lg" type="submit">
            Đăng nhập
          </Button>
          <SubmitStatus pending={isSubmitting} />
        </div>
      </form>
    </AuthFormCard>
  );
}
