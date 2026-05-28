import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  variant?: 'icon' | 'full';
}

export function Logo({ className, variant = 'icon' }: LogoProps) {
  const src =
    variant === 'full'
      ? '/assets/brand/logo-full.png'
      : '/assets/brand/logo-icon.png';
  return (
    <img
      src={src}
      alt="CupMaster"
      className={cn(
        variant === 'full' ? 'h-auto w-72' : 'h-9 w-auto',
        className,
      )}
    />
  );
}
