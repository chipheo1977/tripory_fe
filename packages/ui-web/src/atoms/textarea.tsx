import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const textareaVariants = cva(
  'w-full min-h-(--textarea-min-height) resize-y rounded-control border border-border bg-input px-inline-sm py-inline-sm text-body text-text placeholder:text-placeholder transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-disabled:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-disabled read-only:bg-surface-muted aria-invalid:border-danger',
  {
    variants: { size: { md: 'min-h-(--textarea-min-height)', lg: 'min-h-(--textarea-min-height)' } },
    defaultVariants: { size: 'md' },
  },
);

export type TextareaProps = ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>;

export function Textarea({ className, size, ...props }: TextareaProps) {
  return <textarea {...props} className={textareaVariants({ className, size })} />;
}

export { textareaVariants };
