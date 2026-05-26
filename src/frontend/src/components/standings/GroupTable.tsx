import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { getTeam } from '@/data/teams';
import type { StandingRow } from '@/data/standings';
import type { GroupId } from '@/types';
import { cn } from '@/lib/cn';

interface GroupTableProps {
  group: GroupId;
  rows: readonly StandingRow[];
}

export function GroupTable({ group, rows }: GroupTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[24px_1fr_28px_28px_28px_28px_32px_36px] items-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
        <span className="text-brand-400">Group {group}</span>
        <span />
        <span className="text-right text-text-muted">P</span>
        <span className="text-right text-text-muted">W</span>
        <span className="text-right text-text-muted">D</span>
        <span className="text-right text-text-muted">L</span>
        <span className="text-right text-text-muted">PTS</span>
        <span className="text-right text-text-muted">GD</span>
      </div>
      <div>
        {rows.map((row, i) => {
          const team = getTeam(row.teamId);
          const gd = row.goalsFor - row.goalsAgainst;
          const isTopTwo = i < 2;
          return (
            <div
              key={row.teamId}
              className="grid grid-cols-[24px_1fr_28px_28px_28px_28px_32px_36px] items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-text-secondary">{i + 1}</span>
              <span className="flex items-center gap-2">
                <Flag code={team.code} size="sm" />
                <span className="truncate font-medium">{team.name}</span>
              </span>
              <span className="text-right text-text-secondary">
                {row.played}
              </span>
              <span className="text-right text-text-secondary">{row.won}</span>
              <span className="text-right text-text-secondary">{row.drawn}</span>
              <span className="text-right text-text-secondary">{row.lost}</span>
              <span
                className={cn(
                  'text-right font-bold',
                  isTopTwo ? 'text-brand-400' : 'text-accent-red',
                )}
              >
                {row.points}
              </span>
              <span
                className={cn(
                  'text-right text-xs font-semibold',
                  gd > 0
                    ? 'text-brand-400'
                    : gd < 0
                      ? 'text-accent-red'
                      : 'text-text-muted',
                )}
              >
                {gd > 0 ? `+${gd}` : gd}
              </span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 border-t border-border-subtle py-2.5 text-xs font-semibold text-brand-400 hover:bg-bg-elevated"
      >
        View Group Details
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}
