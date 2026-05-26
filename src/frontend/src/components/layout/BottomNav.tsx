import { NavLink } from 'react-router-dom';
import { CalendarDays, BarChart3, Gamepad2, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { to: '/fixture', label: 'Fixture', icon: CalendarDays },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
] as const;

export function BottomNav() {
  return (
    <nav
      className="safe-bottom sticky bottom-0 z-30 border-t border-border-subtle bg-bg-base/95 backdrop-blur-md"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-400'
                    : 'text-text-muted hover:text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isActive && 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]',
                    )}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <span>{label}</span>
                  <span
                    className={cn(
                      'h-1 w-1 rounded-full transition-all',
                      isActive ? 'bg-brand-500' : 'bg-transparent',
                    )}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
