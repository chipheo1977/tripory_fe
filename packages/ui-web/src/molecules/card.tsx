import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

const cardVariants = cva('relative w-full rounded-container border bg-surface text-left text-text', {
  variants: {
    variant: {
      default: 'border-border shadow-none',
      interactive: 'min-h-touch cursor-pointer border-border transition-[border-color,box-shadow] duration-(--semantic-motion-duration-fast) ease-standard hover:border-border-strong hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
      selected: 'min-h-touch cursor-pointer border-primary-border bg-primary-subtle transition-[border-color,box-shadow] duration-(--semantic-motion-duration-fast) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    },
    padding: {
      sm: 'p-inline-sm',
      md: 'p-stack-md',
      lg: 'p-stack-lg',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md' },
});

type CardSharedProps = {
  children?: ReactNode;
  className?: string;
  padding?: VariantProps<typeof cardVariants>['padding'];
};

type StaticCardProps = CardSharedProps & Omit<ComponentProps<'div'>, keyof CardSharedProps | 'onClick'> & {
  variant?: 'default';
  onClick?: never;
};

type InteractiveCardProps = CardSharedProps & Omit<ComponentProps<'button'>, keyof CardSharedProps> & {
  variant: 'interactive' | 'selected';
};

export type CardProps = StaticCardProps | InteractiveCardProps;

export function Card({ children, className, padding, variant = 'default', ...props }: CardProps) {
  if (variant === 'interactive' || variant === 'selected') {
    return (
      <button
        {...(props as Omit<ComponentProps<'button'>, keyof CardSharedProps>)}
        aria-pressed={variant === 'selected' ? true : undefined}
        className={cardVariants({ className, padding, variant })}
        type={(props as ComponentProps<'button'>).type ?? 'button'}
      >
        {variant === 'selected' ? <span aria-hidden className="absolute right-inline-sm top-inline-sm text-accent">✓</span> : null}
        {children}
      </button>
    );
  }

  return (
    <div {...(props as ComponentProps<'div'>)} className={cardVariants({ className, padding, variant })}>
      {children}
    </div>
  );
}

export { cardVariants };
