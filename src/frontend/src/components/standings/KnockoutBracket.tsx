import { Card } from '@/components/ui/Card';
import type { KnockoutMatch, KnockoutTeam } from '@/data/standings';
import { cn } from '@/lib/cn';

const ROUND_LABEL: Record<KnockoutMatch['round'], string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
};

interface KnockoutBracketProps {
  /** Bracket structure with the Round-of-32 slots resolved from live fixtures. */
  bracket: readonly KnockoutMatch[];
  /** Lookup of real team info by team_id, for rendering slots. */
  teamsById: ReadonlyMap<string, KnockoutTeam>;
  /** Mapping from local match id (e.g. "k32-1") to predicted winner team_id. */
  picks: Record<string, string>;
}

export function KnockoutBracket({ bracket, teamsById, picks }: KnockoutBracketProps) {
  const rounds: KnockoutMatch['round'][] = ['r32', 'r16', 'qf', 'sf', 'final'];

  function resolveTeam(matchId: string): string | null {
    return picks[matchId] ?? null;
  }

  function renderMatch(m: KnockoutMatch) {
    const team1Id = m.team1Id ?? (m.team1FromMatchId ? resolveTeam(m.team1FromMatchId) : null);
    const team2Id = m.team2Id ?? (m.team2FromMatchId ? resolveTeam(m.team2FromMatchId) : null);
    const winnerId = picks[m.id] ?? null;

    return (
      <div key={m.id} className="rounded-xl border border-border-subtle bg-bg-subtle p-2">
        <BracketSlot
          team={team1Id ? (teamsById.get(team1Id) ?? null) : null}
          isWinner={winnerId !== null && winnerId === team1Id}
        />
        <div className="my-1 h-px bg-border-subtle" />
        <BracketSlot
          team={team2Id ? (teamsById.get(team2Id) ?? null) : null}
          isWinner={winnerId !== null && winnerId === team2Id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const matches = bracket.filter((m) => m.round === round);
        return (
          <Card key={round} className="overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-2.5">
              <h3 className="text-sm font-semibold text-brand-400">{ROUND_LABEL[round]}</h3>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">{matches.map(renderMatch)}</div>
          </Card>
        );
      })}
    </div>
  );
}

function BracketSlot({ team, isWinner }: { team: KnockoutTeam | null; isWinner: boolean }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 text-xs text-text-faint">
        <span className="h-4 w-6 rounded bg-bg-elevated" />
        TBA
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-1 py-1 text-xs transition-colors',
        isWinner && 'bg-brand-500/15 font-semibold text-brand-300'
      )}
    >
      <img
        src={`/assets/team-logos/${team.logo}`}
        alt={team.team_name}
        className="h-4 w-4 shrink-0 object-contain"
      />
      <span className="truncate">{team.team_name}</span>
    </div>
  );
}
