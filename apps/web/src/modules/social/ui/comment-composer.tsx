"use client";
// ô viết bình luận của người đã đăng nhập (D-10, D-13, UI-SPEC §Ô nhập).
// - đếm sau trim, luật 1..500 dùng chung với domain; không đặt `maxLength` để dán dài không bị cắt âm thầm.
// - Ctrl/Cmd+Enter gửi; đang ghép dấu (bộ gõ tiếng Việt) thì không gửi (U-05).
// - composer tự giữ chữ: giữ khi lỗi, chỉ xóa khi gửi xong. cha quyết định gọi hook và toast.
import { checkCommentContent, trimmedLength } from "@tripory/social";
import { Button, FormField, FormFieldError, FormFieldLabel, Textarea } from "@tripory/ui-web";
import { SendHorizontal } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { SOCIAL_COPY } from "./social-copy";
import { counterText } from "./social-format";
import { isSubmitShortcut } from "./submit-shortcut";
import { useShortcutHint } from "./use-shortcut-hint";

export type ComposerOutcome =
  | Readonly<{ kind: "sent" }>
  | Readonly<{ kind: "field-error"; message: string }>
  | Readonly<{ kind: "failed" }>;

export type CommentComposerProps = Readonly<{
  visible: boolean;
  onSubmit(content: string): Promise<ComposerOutcome>;
}>;

type ComposerActions = Readonly<{ clear(): void; showError(message: string): void }>;

const OUTCOME_HANDLERS: Readonly<Record<ComposerOutcome["kind"], (outcome: ComposerOutcome, actions: ComposerActions) => void>> = {
  sent: (_outcome, actions) => actions.clear(),
  "field-error": (outcome, actions) => {
    if (outcome.kind === "field-error") actions.showError(outcome.message);
  },
  failed: () => undefined,
};

const COUNTER_TONE = { normal: "text-muted", over: "text-danger" } as const;

function ComposerForm({ onSubmit }: Readonly<{ onSubmit(content: string): Promise<ComposerOutcome> }>) {
  const baseId = useId();
  const textareaId = `${baseId}-o-nhap`;
  const counterId = `${baseId}-dem`;
  const hintId = `${baseId}-goi-y`;
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [announce, setAnnounce] = useState("");
  const pendingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hint = useShortcutHint();

  const check = checkCommentContent(value);
  const tooLong = !check.ok && check.reason === "too-long";
  const canSubmit = check.ok && !pending;
  const message = tooLong ? SOCIAL_COPY.composerTooLong : fieldError;
  const invalid = message !== null;
  const counterClass = `text-label font-regular tabular-nums ${tooLong ? COUNTER_TONE.over : COUNTER_TONE.normal}`;

  const actions: ComposerActions = {
    clear: () => {
      setValue("");
      setAnnounce(SOCIAL_COPY.sentSr);
    },
    showError: (text) => setFieldError(text),
  };

  async function submit() {
    if (pendingRef.current || !canSubmit) return;
    pendingRef.current = true;
    setPending(true);
    setFieldError(null);
    let outcome: ComposerOutcome;
    try {
      outcome = await onSubmit(value);
    } catch {
      outcome = { kind: "failed" };
    }
    pendingRef.current = false;
    setPending(false);
    OUTCOME_HANDLERS[outcome.kind](outcome, actions);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const shortcut = isSubmitShortcut({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isComposing: event.nativeEvent.isComposing,
    });
    if (!shortcut) return;
    event.preventDefault();
    void submit();
  }

  return (
    <form
      aria-busy={pending || undefined}
      className="flex flex-col gap-stack-md"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormField invalid={invalid}>
        <FormFieldLabel className="sr-only" htmlFor={textareaId}>
          {SOCIAL_COPY.composerLabel}
        </FormFieldLabel>
        <Textarea
          aria-describedby={`${counterId} ${hintId}`}
          aria-invalid={invalid || undefined}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          id={textareaId}
          onChange={(event) => {
            setValue(event.target.value);
            setFieldError(null);
            setAnnounce("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={SOCIAL_COPY.composerPlaceholder}
          readOnly={pending}
          ref={textareaRef}
          value={value}
        />
        <FormFieldError match={invalid}>{message}</FormFieldError>
      </FormField>
      <div className="flex items-center justify-between gap-inline-sm">
        <div className="flex min-w-0 flex-col gap-inline-xs">
          <p className={counterClass} id={counterId}>
            {counterText(trimmedLength(value))}
          </p>
          <p className="hidden text-label font-regular text-muted md:block" id={hintId}>
            {hint}
          </p>
        </div>
        <Button
          disabled={!canSubmit}
          icon={SendHorizontal}
          loading={pending}
          loadingLabel={SOCIAL_COPY.submitting}
          size="md"
          type="submit"
          variant="primary"
        >
          {SOCIAL_COPY.submit}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </form>
  );
}

export function CommentComposer({ visible, onSubmit }: CommentComposerProps) {
  if (!visible) return null;
  return <ComposerForm onSubmit={onSubmit} />;
}
