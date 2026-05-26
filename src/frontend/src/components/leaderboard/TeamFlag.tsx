import { cn } from '@/lib/cn';

interface TeamFlagProps {
  flag: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<TeamFlagProps['size']>, string> = {
  sm: 'h-3.5 w-5',
  md: 'h-4 w-6',
  lg: 'h-6 w-9',
};

export function TeamFlag({ flag, size = 'sm', className }: TeamFlagProps) {
  if (!flag) {
    return (
      <span
        className={cn(
          'inline-block rounded-sm bg-bg-elevated',
          SIZE_STYLES[size],
          className,
        )}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={`/assets/team-logos/${flag}`}
      alt=""
      className={cn('rounded-sm object-cover', SIZE_STYLES[size], className)}
    />
  );
}
