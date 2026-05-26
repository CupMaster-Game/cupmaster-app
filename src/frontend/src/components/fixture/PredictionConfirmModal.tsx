import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import type { Match, MatchOutcome } from '@/types';
import { getTeam } from '@/data/teams';
import { formatLongDate, formatTime } from '@/lib/date';

interface PredictionConfirmModalProps {
  match: Match | null;
  pick: MatchOutcome | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PredictionConfirmModal({
  match,
  pick,
  open,
  onClose,
  onConfirm,
}: PredictionConfirmModalProps) {
  if (!match || !pick) {
    return (
      <Modal open={open} onClose={onClose} title="Confirm Prediction">
        <div />
      </Modal>
    );
  }

  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const kickoff = new Date(match.kickoff);

  const pickLabel =
    pick === 'home'
      ? `${home.name} Win`
      : pick === 'away'
        ? `${away.name} Win`
        : 'Draw';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Your Prediction"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} iconLeft={<span>🎯</span>}>
            Lock In
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          {formatLongDate(kickoff)} · {formatTime(kickoff)}
        </p>
        <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag code={home.code} size="lg" />
              <span className="text-sm font-semibold">{home.name}</span>
            </div>
            <span className="text-xs font-bold text-text-muted">VS</span>
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag code={away.code} size="lg" />
              <span className="text-sm font-semibold">{away.name}</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 text-center">
          <p className="label mb-1 text-brand-300">Your Pick</p>
          <p className="text-xl font-bold text-text-primary">{pickLabel}</p>
        </div>
        <p className="text-center text-xs text-text-muted">
          You can change your prediction until kickoff.
        </p>
      </div>
    </Modal>
  );
}
