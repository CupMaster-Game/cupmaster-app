import { Card } from '@/components/ui/Card';
import { truncateTeamName } from '@/lib/team';

export interface GroupTableTeam {
  team_id: string;
  team_name: string;
  country_code: string;
  logo: string;
}

interface GroupTableProps {
  group: string;
  teams: readonly GroupTableTeam[];
}

export function GroupTable({ group, teams }: GroupTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_28px_28px_28px_28px_32px_36px] items-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
        <span className="whitespace-nowrap text-brand-400">Group {group}</span>
        <span className="text-right text-text-muted">P</span>
        <span className="text-right text-text-muted">W</span>
        <span className="text-right text-text-muted">D</span>
        <span className="text-right text-text-muted">L</span>
        <span className="text-right text-text-muted">PTS</span>
        <span className="text-right text-text-muted">GD</span>
      </div>
      <div>
        {teams.map((team, i) => (
          <div
            key={team.team_id}
            className="grid grid-cols-[24px_1fr_28px_28px_28px_28px_32px_36px] items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-sm"
          >
            <span className="font-medium text-text-secondary">{i + 1}</span>
            <span className="flex items-center gap-2">
              <img
                src={`/assets/team-logos/${team.logo}`}
                alt={team.team_name}
                className="h-5 w-5 shrink-0 object-contain"
              />
              <span className="truncate font-medium">{truncateTeamName(team.team_name)}</span>
            </span>
            <span className="text-right text-text-secondary">0</span>
            <span className="text-right text-text-secondary">0</span>
            <span className="text-right text-text-secondary">0</span>
            <span className="text-right text-text-secondary">0</span>
            <span className="text-right font-bold text-text-muted">0</span>
            <span className="text-right text-xs font-semibold text-text-muted">0</span>
          </div>
        ))}
      </div>
      {/* </><button
        type="button"
        className="flex w-full items-center justify-center gap-1 border-t border-border-subtle py-2.5 text-xs font-semibold text-brand-400 hover:bg-bg-elevated"
      >
        View Group Details
        <ChevronRight className="h-3.5 w-3.5" />
      </button> */}
    </Card>
  );
}
