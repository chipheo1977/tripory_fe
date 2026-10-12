import type { LucideIcon } from 'lucide-react';

export type IconProps = {
  className?: string;
  icon: LucideIcon;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-(--spinner-size-sm)',
  md: 'size-(--spinner-size-md)',
  lg: 'size-(--spinner-size-lg)',
} as const;

export function Icon({ className, icon: Glyph, label, size = 'md' }: IconProps) {
  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`${sizeClasses[size]} shrink-0 ${className ?? ''}`.trim()}
      role={label ? 'img' : undefined}
      strokeWidth={2}
    />
  );
}
