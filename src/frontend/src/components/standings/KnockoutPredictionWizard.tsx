import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { KnockoutMatch, KnockoutTeam } from '@/data/standings';
import { truncateTeamName } from '@/lib/team';
import { cn } from '@/lib/cn';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const ROUNDS: readonly { key: KnockoutMatch['round']; label: string }[] = [
  { key: 'r32', label: 'Round of 32' },
  { key: 'r16', label: 'Round of 16' },
  { key: 'qf', label: 'Quarter-finals' },
  { key: 'sf', label: 'Semi-finals' },
  { key: 'final', label: 'Final' },
];

// Show at most this many matches per wizard step so a round (the Round of 32
// has 16) never overflows the modal. Rounds with more matches are split across
// several sequential steps.
const MATCHES_PER_STEP = 4;

interface WizardPage {
  round: KnockoutMatch['round'];
  label: string;
  matches: readonly KnockoutMatch[];
  pageInRound: number;
  pagesInRound: number;
}

export type KnockoutPicks = Record<string, string>;

interface KnockoutPredictionWizardProps {
  open: boolean;
  onClose: () => void;
  /** Bracket structure with the Round-of-32 slots resolved from live fixtures. */
  bracket: readonly KnockoutMatch[];
  /** Lookup of real team info by team_id, for rendering pick buttons. */
  teamsById: ReadonlyMap<string, KnockoutTeam>;
  initialPicks?: KnockoutPicks;
  requiresPayment?: boolean;
  onSubmit: (picks: KnockoutPicks) => Promise<{ ok: boolean; error?: string }>;
}

export function KnockoutPredictionWizard({
  open,
  onClose,
  bracket,
  teamsById,
  initialPicks,
  requiresPayment,
  onSubmit,
}: KnockoutPredictionWizardProps) {
  const [picks, setPicks] = useState<KnockoutPicks>(initialPicks ?? {});
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset wizard state each time the modal is opened, so reopening after a
    // refresh picks up the latest server-side prediction.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setPicks(initialPicks ?? {});
      setStepIdx(0);
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialPicks]);

  // Flatten the bracket into wizard steps of at most MATCHES_PER_STEP matches,
  // in round order. A round with more matches than the limit spans multiple
  // steps (e.g. the Round of 32 → 4 steps of 4).
  const pages = useMemo<WizardPage[]>(() => {
    const result: WizardPage[] = [];
    for (const r of ROUNDS) {
      const roundMatches = bracket.filter((m) => m.round === r.key);
      if (roundMatches.length === 0) continue;
      const pagesInRound = Math.ceil(roundMatches.length / MATCHES_PER_STEP);
      for (let i = 0; i < pagesInRound; i++) {
        result.push({
          round: r.key,
          label: r.label,
          matches: roundMatches.slice(i * MATCHES_PER_STEP, (i + 1) * MATCHES_PER_STEP),
          pageInRound: i + 1,
          pagesInRound,
        });
      }
    }
    return result;
  }, [bracket]);

  const currentPage = pages[stepIdx];
  const pageMatches = currentPage?.matches ?? [];

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

  const allPicked = pageMatches.every((m) => Boolean(picks[m.id]));
  const isLastStep = stepIdx === pages.length - 1;

  async function next() {
    if (!allPicked) return;
    if (!isLastStep) {
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
    // Submitted successfully — close the wizard.
    onClose();
  }

  function back() {
    if (stepIdx === 0 || submitting) return;
    setStepIdx(stepIdx - 1);
  }

  function close() {
    if (submitting) return;
    onClose();
    setPicks(initialPicks ?? {});
    setStepIdx(0);
    setError(null);
  }

  if (!currentPage) return null;

  const title =
    currentPage.pagesInRound > 1
      ? `${currentPage.label} (${currentPage.pageInRound.toString()}/${currentPage.pagesInRound.toString()})`
      : currentPage.label;

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      fullScreen
      footer={
        <>
          <Button
            variant="secondary"
            onClick={back}
            disabled={stepIdx === 0 || submitting}
            iconLeft={<ChevronLeft className="h-4 w-4" />}
            className="whitespace-nowrap"
          >
            Back
          </Button>
          <Button
            onClick={() => { void next(); }}
            disabled={!allPicked || submitting}
            iconRight={<ChevronRight className="h-4 w-4" />}
            className="whitespace-nowrap"
          >
            {submitting
              ? 'Submitting…'
              : isLastStep
                ? requiresPayment
                  ? 'Lock In Champion (0.05$)'
                  : 'Lock In Champion'
                : 'Next'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Step {stepIdx + 1} of {pages.length}
            </span>
            <span>
              {Object.keys(picks).length} of {bracket.length} matches
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${((stepIdx + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Pick the winner from each match. Your choices flow into the next round.
        </p>
        <div className="space-y-2">
          {pageMatches.map((m) => {
            const team1Id = resolveSlot(m, 'team1');
            const team2Id = resolveSlot(m, 'team2');
            return (
              <div key={m.id} className="rounded-2xl border border-border-subtle bg-bg-subtle p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-text-muted">
                  {m.id === 'kfinal' ? 'Final' : `Match ${m.id.split('-')[1] ?? ''}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <TeamPickButton
                    team={team1Id ? (teamsById.get(team1Id) ?? null) : null}
                    selected={picks[m.id] === team1Id}
                    onClick={() => {
                      if (team1Id) pickWinner(m.id, team1Id);
                    }}
                  />
                  <TeamPickButton
                    team={team2Id ? (teamsById.get(team2Id) ?? null) : null}
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
  team,
  selected,
  onClick,
}: {
  team: KnockoutTeam | null;
  selected: boolean;
  onClick: () => void;
}) {
  if (!team) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-base px-3 py-3 text-xs text-text-faint">
        TBD
      </div>
    );
  }
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
      <img
        src={`/assets/team-logos/${team.logo}`}
        alt={team.team_name}
        className="h-5 w-5 shrink-0 object-contain"
      />
      <span className="truncate">{truncateTeamName(team.team_name)}</span>
      {selected && <Check className="ml-auto h-4 w-4 shrink-0" />}
    </button>
  );
}
