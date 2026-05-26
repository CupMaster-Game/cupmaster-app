import { cn } from '@/lib/cn';
import { getAvatarColor, getInitials } from '@/lib/avatar';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ring?: 'none' | 'brand' | 'gold' | 'silver' | 'bronze';
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
};

const RING_STYLES: Record<NonNullable<AvatarProps['ring']>, string> = {
  none: '',
  brand: 'ring-2 ring-brand-500 ring-offset-2 ring-offset-bg-base',
  gold: 'ring-2 ring-accent-gold ring-offset-2 ring-offset-bg-base',
  silver: 'ring-2 ring-accent-silver ring-offset-2 ring-offset-bg-base',
  bronze: 'ring-2 ring-accent-bronze ring-offset-2 ring-offset-bg-base',
};

export function Avatar({
  name,
  size = 'md',
  ring = 'none',
  className,
}: AvatarProps) {
  const bg = getAvatarColor(name);
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-bg-base shadow-inner',
        SIZE_STYLES[size],
        RING_STYLES[ring],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${bg}dd 100%)`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
