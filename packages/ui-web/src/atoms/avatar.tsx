import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-surface-muted align-middle text-label font-semibold text-text select-none',
  {
    variants: { size: { sm: 'size-control-sm', md: 'size-control-md', lg: 'size-control-lg' } },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarProps = VariantProps<typeof avatarVariants> & {
  alt?: string;
  className?: string;
  name: string;
  src?: string;
};

function initials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join('');
}

export function Avatar({ alt, className, name, size, src }: AvatarProps) {
  return (
    <BaseAvatar.Root aria-label={alt ?? name} className={avatarVariants({ className, size })} role="img">
      {src ? <BaseAvatar.Image alt="" className="size-full object-cover" keepMounted src={src} /> : null}
      <BaseAvatar.Fallback className="flex size-full items-center justify-center">{initials(name)}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}

export { avatarVariants };
