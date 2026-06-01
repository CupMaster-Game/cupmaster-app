import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import { Modal } from '@/components/ui/Modal';
import { KNOCKOUT_BRACKET, type KnockoutMatch } from '@/data/standings';
import { getTeam } from '@/data/teams';
import { cn } from '@/lib/cn';
import { Check, ChevronRight, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const ROUNDS: readonly { key: KnockoutMatch['round']; label: string }[] = [
  { key: 'r32', label: 'Round of 32' },
  { key: 'r16', label: 'Round of 16' },
  { key: 'qf', label: 'Quarter-finals' },
  { key: 'sf', label: 'Semi-finals' },
  { key: 'final', label: 'Final' },
];

export type KnockoutPicks = Record<string, string>;

interface KnockoutPredictionWizardProps {
  open: boolean;
  onClose: () => void;
  initialPicks?: KnockoutPicks;
  onSubmit: (picks: KnockoutPicks) => Promise<{ ok: boolean; error?: string }>;
}

export function KnockoutPredictionWizard({
  open,
  onClose,
  initialPicks,
  onSubmit,
}: KnockoutPredictionWizardProps) {
  const [picks, setPicks] = useState<KnockoutPicks>(initialPicks ?? {});
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset wizard state each time the modal is opened, so reopening after a
    // refresh picks up the latest server-side prediction.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setPicks(initialPicks ?? {});
      setStepIdx(0);
      setDone(false);
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialPicks]);

  const currentRound = ROUNDS[stepIdx];

  const roundMatches = useMemo(
    () => (currentRound ? KNOCKOUT_BRACKET.filter((m) => m.round === currentRound.key) : []),
    [currentRound]
  );

  function resolveSlot(m: KnockoutMatch, side: 'team1' | 'team2'): string | null {
    const fromId = side === 'team1' ? m.team1FromMatchId : m.team2FromMatchId;
    const teamId = side === 'team1' ? m.team1Id : m.team2Id;
    if (teamId) return teamId;
    if (fromId) return picks[fromId] ?? null;
    return null;
  }

  function pickWinner(matchId: string, teamId: string) {
    setPicks({ ...picks, [matchId]: teamId });
  }

  const allPicked = roundMatches.every((m) => Boolean(picks[m.id]));

  async function next() {
    if (!allPicked) return;
    if (stepIdx < ROUNDS.length - 1) {
      setStepIdx(stepIdx + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(picks);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Failed to submit. Please try again.');
      return;
    }
    setDone(true);
  }

  function close() {
    if (submitting) return;
    onClose();
    setPicks(initialPicks ?? {});
    setStepIdx(0);
    setDone(false);
    setError(null);
  }

  if (done) {
    const champion = picks.kfinal;
    return (
      <Modal open={open} onClose={close} title="Bracket Locked In!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold/15">
            <Trophy className="h-8 w-8 text-accent-gold" />
          </div>
          <p className="text-base font-semibold">Your bracket is saved.</p>
          {champion && (
            <p className="text-sm text-text-muted">
              You picked{' '}
              <span className="font-semibold text-text-primary">{getTeam(champion).name}</span> as
              your World Cup champion.
            </p>
          )}
          <Button fullWidth onClick={close}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  if (!currentRound) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={currentRound.label}
      footer={
        <Button
          onClick={() => { void next(); }}
          disabled={!allPicked || submitting}
          fullWidth
        >
          {submitting
            ? 'Submitting…'
            : stepIdx === ROUNDS.length - 1
              ? 'Lock In Champion'
              : 'Next Round'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Round {stepIdx + 1} of {ROUNDS.length}
            </span>
            <span>
              {Object.keys(picks).length} of {KNOCKOUT_BRACKET.length} matches
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${((stepIdx + 1) / ROUNDS.length) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Pick the winner from each match. Your choices flow into the next round.
        </p>
        <div className="space-y-2">
          {roundMatches.map((m) => {
            const team1Id = resolveSlot(m, 'team1');
            const team2Id = resolveSlot(m, 'team2');
            return (
              <div key={m.id} className="rounded-2xl border border-border-subtle bg-bg-subtle p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-text-muted">
                  Match {m.id.replace(/[^0-9]/g, '') || 'Final'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <TeamPickButton
                    teamId={team1Id}
                    selected={picks[m.id] === team1Id}
                    onClick={() => {
                      if (team1Id) pickWinner(m.id, team1Id);
                    }}
                  />
                  <TeamPickButton
                    teamId={team2Id}
                    selected={picks[m.id] === team2Id}
                    onClick={() => {
                      if (team2Id) pickWinner(m.id, team2Id);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {error && (
          <p className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-center text-xs text-accent-red">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function TeamPickButton({
  teamId,
  selected,
  onClick,
}: {
  teamId: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  if (!teamId) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-base px-3 py-3 text-xs text-text-faint">
        TBD
      </div>
    );
  }
  const team = getTeam(teamId);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98]',
        selected
          ? 'border-brand-500 bg-brand-500/15 text-brand-300 shadow-glow-soft'
          : 'border-border-default bg-bg-elevated text-text-primary hover:border-border-strong'
      )}
    >
      <Flag code={team.code} />
      <span className="truncate">{team.name}</span>
      {selected && <Check className="ml-auto h-4 w-4 shrink-0" />}
    </button>
  );
}
