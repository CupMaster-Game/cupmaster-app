import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        className="h-8 w-8 shrink-0"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 8c4 12 14 18 28 12-2 9-11 16-21 14C5 32 1 19 6 8z"
          fill="url(#cup-grad)"
        />
        <circle cx="20" cy="14" r="6" fill="#0b0f17" stroke="#fff" strokeWidth="1.5" />
        <path
          d="M16.5 14l1.5-2.5L20 13l2-1.5 1.5 2.5-1 2.5h-5l-1-2.5z"
          fill="#fff"
        />
        <path d="M28 6l1.2 2.5L32 9l-2 1.8.6 2.7L28 12l-2.6 1.5.6-2.7L24 9l2.8-.5L28 6z" fill="#22c55e" />
        <defs>
          <linearGradient id="cup-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight">
          <span className="text-text-primary">Cup</span>
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            Master
          </span>
        </span>
      )}
    </div>
  );
}
