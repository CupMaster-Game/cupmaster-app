import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { KNOCKOUT_BRACKET, type KnockoutMatch } from '@/data/standings';
import { getTeam } from '@/data/teams';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/store/useAppStore';

const ROUND_LABEL: Record<KnockoutMatch['round'], string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
};

export function KnockoutBracket() {
  const { knockoutPredictions } = useAppStore();
  const rounds: KnockoutMatch['round'][] = ['r32', 'r16', 'qf', 'sf', 'final'];

  function resolveTeam(matchId: string): string | null {
    const pred = knockoutPredictions[matchId];
    return pred?.winnerTeamId ?? null;
  }

  function renderMatch(m: KnockoutMatch) {
    const team1Id = m.team1Id ?? (m.team1FromMatchId ? resolveTeam(m.team1FromMatchId) : null);
    const team2Id = m.team2Id ?? (m.team2FromMatchId ? resolveTeam(m.team2FromMatchId) : null);
    const winnerId = knockoutPredictions[m.id]?.winnerTeamId ?? null;

    return (
      <div key={m.id} className="rounded-xl border border-border-subtle bg-bg-subtle p-2">
        <BracketSlot teamId={team1Id} isWinner={winnerId !== null && winnerId === team1Id} />
        <div className="my-1 h-px bg-border-subtle" />
        <BracketSlot teamId={team2Id} isWinner={winnerId !== null && winnerId === team2Id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const matches = KNOCKOUT_BRACKET.filter((m) => m.round === round);
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

function BracketSlot({ teamId, isWinner }: { teamId: string | null; isWinner: boolean }) {
  if (!teamId) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 text-xs text-text-faint">
        <span className="h-4 w-6 rounded bg-bg-elevated" />
        TBA
      </div>
    );
  }
  const team = getTeam(teamId);
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-1 py-1 text-xs transition-colors',
        isWinner && 'bg-brand-500/15 font-semibold text-brand-300'
      )}
    >
      <Flag code={team.code} size="sm" />
      <span className="truncate">{team.name}</span>
    </div>
  );
}
