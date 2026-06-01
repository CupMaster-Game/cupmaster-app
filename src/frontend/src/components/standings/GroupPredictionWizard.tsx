import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { GroupTableTeam } from '@/components/standings/GroupTable';

export interface WizardGroup {
  groupName: string;
  teams: readonly GroupTableTeam[];
}

export type GroupPicks = Record<string, readonly string[]>;

interface GroupPredictionWizardProps {
  open: boolean;
  onClose: () => void;
  groups: readonly WizardGroup[];
  initialPicks?: GroupPicks;
  onSubmit: (picks: GroupPicks) => Promise<{ ok: boolean; error?: string }>;
}

export function GroupPredictionWizard({
  open,
  onClose,
  groups,
  initialPicks,
  onSubmit,
}: GroupPredictionWizardProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [picks, setPicks] = useState<GroupPicks>(initialPicks ?? {});
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

  const currentGroup = groups[stepIdx];
  const totalSteps = groups.length;
  const groupName = currentGroup?.groupName;
  const groupTeams = currentGroup?.teams ?? [];

  const currentPick = useMemo(
    () => (groupName ? (picks[groupName] ?? []) : []),
    [groupName, picks],
  );

  if (!currentGroup || !groupName) return null;

  const isComplete = currentPick.length === groupTeams.length;

  function togglePick(teamId: string) {
    if (!groupName) return;
    const existing = picks[groupName] ?? [];
    if (existing.includes(teamId)) {
      setPicks({
        ...picks,
        [groupName]: existing.filter((id) => id !== teamId),
      });
    } else if (existing.length < groupTeams.length) {
      setPicks({ ...picks, [groupName]: [...existing, teamId] });
    }
  }

  async function next() {
    if (!isComplete || !groupName) return;
    if (stepIdx < totalSteps - 1) {
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
    onClose();
  }

  function back() {
    if (stepIdx === 0) return;
    setStepIdx(stepIdx - 1);
  }

  function close() {
    if (submitting) return;
    onClose();
    setStepIdx(0);
    setPicks(initialPicks ?? {});
    setError(null);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Predict Group ${groupName}`}
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
            disabled={!isComplete || submitting}
            iconRight={<ChevronRight className="h-4 w-4" />}
            className="whitespace-nowrap"
          >
            {submitting
              ? 'Submitting…'
              : stepIdx === totalSteps - 1
                ? 'Finish'
                : 'Next'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Step {stepIdx + 1} of {totalSteps}
            </span>
            <span>
              {currentPick.length}/{groupTeams.length} picked
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Tap teams in the order you predict them to finish (1st → 4th).
        </p>

        <div className="space-y-2">
          {groupTeams.map((team) => {
            const order = currentPick.indexOf(team.team_id);
            const picked = order !== -1;
            return (
              <button
                key={team.team_id}
                type="button"
                onClick={() => { togglePick(team.team_id); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  picked
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-border-subtle bg-bg-subtle hover:border-border-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    picked
                      ? 'bg-brand-gradient text-bg-base'
                      : 'bg-bg-elevated text-text-muted',
                  )}
                >
                  {picked ? order + 1 : '—'}
                </span>
                <img
                  src={`/assets/team-logos/${team.logo}`}
                  alt={team.team_name}
                  className="h-6 w-6 shrink-0 object-contain"
                />
                <span className="flex-1 font-semibold">{team.team_name}</span>
              </button>
            );
          })}
        </div>

        {currentPick.length > 0 && (
          <button
            type="button"
            onClick={() => { setPicks({ ...picks, [groupName]: [] }); }}
            className="w-full text-center text-xs text-text-muted hover:text-text-secondary"
          >
            Clear order
          </button>
        )}

        {error && (
          <p className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-center text-xs text-accent-red">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function GroupSummary({
  teams,
  prediction,
}: {
  teams: readonly GroupTableTeam[];
  prediction?: readonly string[];
}) {
  if (!prediction || prediction.length === 0) return null;
  const teamsById = new Map(teams.map((t) => [t.team_id, t]));
  return (
    <div className="flex items-center gap-1.5">
      {prediction.map((id, idx) => {
        const team = teamsById.get(id);
        if (!team) return null;
        return (
          <span
            key={id}
            className="flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-text-secondary"
          >
            <span className="font-bold text-brand-400">{idx + 1}</span>
            <img
              src={`/assets/team-logos/${team.logo}`}
              alt={team.team_name}
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
          </span>
        );
      })}
    </div>
  );
}
