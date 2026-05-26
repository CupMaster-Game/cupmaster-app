import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  interactive?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  interactive = false,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        variant === 'default' && 'card',
        variant === 'elevated' && 'card-elevated',
        variant === 'flat' &&
          'rounded-2xl border border-border-subtle bg-bg-subtle',
        interactive &&
          'transition-colors hover:border-border-default cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
