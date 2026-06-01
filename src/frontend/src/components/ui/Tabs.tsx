import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly TabOption<T>[];
  variant?: 'segmented' | 'underline';
  className?: string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  variant = 'segmented',
  className,
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'flex gap-1 rounded-2xl border border-border-subtle bg-bg-subtle p-1',
          className
        )}
        role="tablist"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                onChange(opt.value);
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                active
                  ? 'bg-brand-gradient text-bg-base shadow-glow-soft'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex border-b border-border-subtle', className)} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              onChange(opt.value);
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
              active
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
