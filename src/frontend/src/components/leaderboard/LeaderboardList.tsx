import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Flag } from '@/components/ui/Flag';
import type { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/cn';

interface LeaderboardListProps {
  entries: readonly LeaderboardEntry[];
}

export function LeaderboardList({ entries }: LeaderboardListProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2 border-b border-border-subtle px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        <span>Rank</span>
        <span>Player</span>
        <span>Points</span>
      </div>
      {entries.map((entry) => (
        <Row key={entry.userId} entry={entry} />
      ))}
    </Card>
  );
}

export function YouRow({ entry }: { entry: LeaderboardEntry | undefined }) {
  if (!entry) return null;
  return (
    <Card className="border-brand-500/50 bg-brand-500/5">
      <Row entry={entry} highlighted />
    </Card>
  );
}

function Row({
  entry,
  highlighted = false,
}: {
  entry: LeaderboardEntry;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[40px_1fr_auto] items-center gap-2 px-4 py-2.5',
        !highlighted && 'border-t border-border-subtle first:border-t-0',
      )}
    >
      <span
        className={cn(
          'text-sm font-bold',
          highlighted ? 'text-brand-400' : 'text-text-secondary',
        )}
      >
        {entry.rank}
      </span>
      <div className="flex items-center gap-2">
        <Avatar name={entry.name} size="sm" />
        <span className="text-sm font-semibold">{entry.name}</span>
        <Flag code={entry.countryCode} size="sm" />
      </div>
      <span className="text-sm font-bold text-brand-400">
        {entry.points.toLocaleString()}
      </span>
    </div>
  );
}
