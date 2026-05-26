import { countryCodeToFlag } from '@/lib/flag';
import { cn } from '@/lib/cn';

interface FlagProps {
  code: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<FlagProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export function Flag({ code, size = 'md', className }: FlagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center leading-none',
        SIZE_STYLES[size],
        className,
      )}
      role="img"
      aria-label={`${code} flag`}
    >
      {countryCodeToFlag(code)}
    </span>
  );
}
