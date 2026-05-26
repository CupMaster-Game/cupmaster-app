import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import { GROUP_IDS, getTeam, teamsInGroup } from '@/data/teams';
import type { GroupId } from '@/types';
import { useAppStore } from '@/store/AppStore';
import { cn } from '@/lib/cn';

interface GroupPredictionWizardProps {
  open: boolean;
  onClose: () => void;
}

export function GroupPredictionWizard({
  open,
  onClose,
}: GroupPredictionWizardProps) {
  const { setGroupOrder } = useAppStore();
  const [stepIdx, setStepIdx] = useState(0);
  const [picks, setPicks] = useState<
    Partial<Record<GroupId, readonly string[]>>
  >({});
  const [done, setDone] = useState(false);

  const currentGroup = GROUP_IDS[stepIdx];
  const totalSteps = GROUP_IDS.length;

  const currentPick = useMemo(
    () => (currentGroup ? (picks[currentGroup] ?? []) : []),
    [currentGroup, picks],
  );

  if (!currentGroup) return null;

  const groupTeams = teamsInGroup(currentGroup);
  const isComplete = currentPick.length === groupTeams.length;

  function togglePick(teamId: string) {
    if (!currentGroup) return;
    const existing = picks[currentGroup] ?? [];
    if (existing.includes(teamId)) {
      setPicks({
        ...picks,
        [currentGroup]: existing.filter((id) => id !== teamId),
      });
    } else if (existing.length < groupTeams.length) {
      setPicks({ ...picks, [currentGroup]: [...existing, teamId] });
    }
  }

  function next() {
    if (!isComplete || !currentGroup) return;
    if (stepIdx < totalSteps - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      // submit all
      for (const g of GROUP_IDS) {
        const p = picks[g];
        if (p?.length === 4) {
          const [a, b, c, d] = p;
          if (a && b && c && d) setGroupOrder(g, [a, b, c, d]);
        }
      }
      setDone(true);
    }
  }

  function back() {
    if (stepIdx === 0) return;
    setStepIdx(stepIdx - 1);
  }

  function close() {
    onClose();
    setStepIdx(0);
    setPicks({});
    setDone(false);
  }

  if (done) {
    return (
      <Modal open={open} onClose={close} title="Predictions Submitted!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15">
            <Check className="h-8 w-8 text-brand-400" />
          </div>
          <p className="text-base font-semibold">
            All 12 group predictions saved.
          </p>
          <p className="text-sm text-text-muted">
            Earn points for each correct team position when the group stage
            finishes.
          </p>
          <Button fullWidth onClick={close}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Predict Group ${currentGroup}`}
      footer={
        <>
          <Button variant="secondary" onClick={back} disabled={stepIdx === 0}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={next} disabled={!isComplete}>
            {stepIdx === totalSteps - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="h-4 w-4" />
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
            const order = currentPick.indexOf(team.id);
            const picked = order !== -1;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => { togglePick(team.id); }}
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
                <Flag code={team.code} />
                <span className="flex-1 font-semibold">{team.name}</span>
              </button>
            );
          })}
        </div>

        {currentPick.length > 0 && (
          <button
            type="button"
            onClick={() => { setPicks({ ...picks, [currentGroup]: [] }); }}
            className="w-full text-center text-xs text-text-muted hover:text-text-secondary"
          >
            Clear order
          </button>
        )}
      </div>
    </Modal>
  );
}

export function GroupSummary({ group }: { group: string }) {
  const { groupPredictions } = useAppStore();
  const pred = groupPredictions[group as GroupId];
  if (!pred) return null;
  return (
    <div className="flex items-center gap-1.5">
      {pred.map((id, idx) => {
        const team = getTeam(id);
        return (
          <span
            key={id}
            className="flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-text-secondary"
          >
            <span className="font-bold text-brand-400">{idx + 1}</span>
            <Flag code={team.code} size="sm" />
          </span>
        );
      })}
    </div>
  );
}
