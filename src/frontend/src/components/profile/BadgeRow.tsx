import { cn } from '@/lib/cn';
import { badgeKey } from '@/store/badgeKey';
import { useAppStore } from '@/store/useAppStore';
import type { BadgeProgress, BadgeTier } from '@/types';
import {
  Check,
  CheckCircle2,
  FlagIcon,
  Gamepad2,
  HelpCircle,
  Lock,
  Table2,
  Target,
  Trophy,
  UserCircle2,
} from 'lucide-react';

interface BadgeRowProps {
  badge: BadgeProgress;
}

const TIER_ORDER: readonly BadgeTier[] = ['bronze', 'silver', 'gold'];

const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: 'text-accent-bronze',
  silver: 'text-accent-silver',
  gold: 'text-accent-gold',
};

const TIER_RING: Record<BadgeTier, string> = {
  bronze: 'ring-accent-bronze/60',
  silver: 'ring-accent-silver/60',
  gold: 'ring-accent-gold/60',
};

const CATEGORY_ICON: Record<
  BadgeProgress['category'],
  React.ComponentType<{ className?: string }>
> = {
  predictions_made: Target,
  correct_predictions: CheckCircle2,
  games_played: Gamepad2,
  trivia_master: HelpCircle,
  good_guesser: UserCircle2,
  matching_cards: FlagIcon,
  group_master: Table2,
  bracket_master: Trophy,
};

export function BadgeRow({ badge }: BadgeRowProps) {
  const { claimedBadges, claimBadge } = useAppStore();
  const Icon = CATEGORY_ICON[badge.category];

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
          <Icon className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{badge.label}</h3>
          <p className="text-xs">
            <span className="font-bold text-brand-400">{badge.current.toLocaleString()}</span>
            <span className="text-text-muted">
              {' '}
              / {badge.thresholds.gold.toLocaleString()}
              {badge.unit ? ` ${badge.unit}` : ''}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {TIER_ORDER.map((tier, idx) => {
          const threshold = badge.thresholds[tier];
          const achieved = badge.current >= threshold;
          const claimed = claimedBadges[badgeKey(badge.category, tier)] === true;
          const next = TIER_ORDER[idx + 1];
          return (
            <div key={tier} className="flex flex-col items-center" style={{ width: '52px' }}>
              <button
                type="button"
                onClick={() => {
                  if (achieved && !claimed) claimBadge(badge.category, tier);
                }}
                disabled={!achieved || claimed}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                  achieved
                    ? `bg-bg-elevated ring-2 ${TIER_RING[tier]} ${claimed ? '' : 'hover:scale-110 cursor-pointer'}`
                    : 'bg-bg-elevated/40 opacity-50'
                )}
                aria-label={`${tier} badge`}
              >
                {achieved ? (
                  claimed ? (
                    <Check className={cn('h-4 w-4', TIER_COLOR[tier])} />
                  ) : (
                    <ShieldIcon className={cn('h-5 w-5', TIER_COLOR[tier])} />
                  )
                ) : (
                  <Lock className="h-3.5 w-3.5 text-text-faint" />
                )}
                {achieved && !claimed && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-bg-base" />
                )}
              </button>
              <span className="mt-1 text-[10px] font-medium text-text-muted">
                {threshold.toLocaleString()}
              </span>
              {next && (
                <span className="absolute" aria-hidden="true">
                  {/* visual separator dots handled by spacing only */}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z" />
    </svg>
  );
}
