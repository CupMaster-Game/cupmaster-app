import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { TeamFlag } from '@/components/leaderboard/TeamFlag';
import type { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/cn';

interface TopThreeProps {
  entries: readonly LeaderboardEntry[];
}

export function TopThree({ entries }: TopThreeProps) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  if (!first || !second || !third) return null;

  return (
    <div className="grid grid-cols-3 items-end gap-2">
      <Podium
        entry={second}
        rank={2}
        ring="silver"
        icon={<Medal className="h-5 w-5 text-accent-silver" />}
        label="2"
        height="h-36"
      />
      <Podium
        entry={first}
        rank={1}
        ring="gold"
        icon={<Trophy className="h-5 w-5 text-accent-gold" />}
        label="1"
        height="h-44"
        accentBg="from-accent-gold/15"
      />
      <Podium
        entry={third}
        rank={3}
        ring="bronze"
        icon={<Award className="h-5 w-5 text-accent-bronze" />}
        label="3"
        height="h-36"
      />
    </div>
  );
}

function Podium({
  entry,
  ring,
  icon,
  label,
  height,
  accentBg = 'from-bg-elevated/40',
}: {
  entry: LeaderboardEntry;
  rank: number;
  ring: 'gold' | 'silver' | 'bronze';
  icon: React.ReactNode;
  label: string;
  height: string;
  accentBg?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-end gap-2 rounded-2xl border border-border-subtle bg-gradient-to-b to-bg-surface p-3 text-center',
        accentBg,
        height,
      )}
    >
      <div className="absolute -top-3 flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-bold ring-1 ring-border-default">
        {icon}
        <span>{label}</span>
      </div>
      <Avatar name={entry.name} size="lg" ring={ring} />
      <div>
        <p className="text-sm font-bold truncate max-w-[7rem]">{entry.name}</p>
        <div className="mt-1 flex justify-center">
          <TeamFlag flag={entry.flag} size="sm" />
        </div>
      </div>
      <p className="text-base font-bold text-brand-400">
        {entry.total_score.toLocaleString()}
        <span className="ml-1 text-[10px] text-text-muted">PTS</span>
      </p>
    </div>
  );
}
