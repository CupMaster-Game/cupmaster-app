import { Users, ChevronRight, HelpCircle, UserCircle2, Flag as FlagIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { GameSummary } from '@/types';
import { cn } from '@/lib/cn';

interface GameCardProps {
  game: GameSummary;
  onPlay: () => void;
}

const ACCENT: Record<GameSummary['accent'], { bg: string; text: string; ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  purple: {
    bg: 'from-accent-purple/20 via-bg-surface to-bg-surface',
    text: 'text-accent-purple',
    ring: 'ring-accent-purple/40',
    icon: HelpCircle,
  },
  green: {
    bg: 'from-brand-500/20 via-bg-surface to-bg-surface',
    text: 'text-brand-400',
    ring: 'ring-brand-500/40',
    icon: UserCircle2,
  },
  orange: {
    bg: 'from-accent-orange/20 via-bg-surface to-bg-surface',
    text: 'text-accent-orange',
    ring: 'ring-accent-orange/40',
    icon: FlagIcon,
  },
};

export function GameCard({ game, onPlay }: GameCardProps) {
  const accent = ACCENT[game.accent];
  const Icon = accent.icon;
  return (
    <Card className={cn('relative overflow-hidden bg-gradient-to-br', accent.bg)}>
      <div className="grid grid-cols-[64px_1fr] items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated ring-2',
            accent.ring,
          )}
        >
          <Icon className={cn('h-7 w-7', accent.text)} />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">{game.title}</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {game.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <span className={cn('flex items-center gap-1.5 text-xs font-semibold', accent.text)}>
          <Users className="h-3.5 w-3.5" />
          {game.playedCount.toLocaleString()} played
        </span>
        <Button size="sm" onClick={onPlay} iconRight={<ChevronRight className="h-4 w-4" />}>
          Play
        </Button>
      </div>
    </Card>
  );
}
