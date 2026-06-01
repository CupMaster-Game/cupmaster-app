import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { ApiFixture, ApiFixtureTeam, MatchOutcome } from '@/types';
import { formatLongDate, formatTime } from '@/lib/date';
import { truncateTeamName } from '@/lib/team';

interface PredictionConfirmModalProps {
  fixture: ApiFixture | null;
  pick: MatchOutcome | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}

export function PredictionConfirmModal({
  fixture,
  pick,
  open,
  onClose,
  onConfirm,
  submitting = false,
  errorMessage = null,
}: PredictionConfirmModalProps) {
  if (!fixture || !pick || !fixture.team1 || !fixture.team2) {
    return (
      <Modal open={open} onClose={onClose} title="Confirm Prediction">
        <div />
      </Modal>
    );
  }

  const team1 = fixture.team1;
  const team2 = fixture.team2;
  const kickoff = new Date(fixture.match_time);

  const pickLabel =
    pick === 'team1'
      ? `${truncateTeamName(team1.team_name)} Win`
      : pick === 'team2'
        ? `${truncateTeamName(team2.team_name)} Win`
        : 'Draw';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Your Prediction"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={submitting} iconLeft={<span>🎯</span>}>
            {submitting ? 'Locking In…' : 'Lock In'}
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
            <TeamCell team={team1} />
            <span className="text-xs font-bold text-text-muted">VS</span>
            <TeamCell team={team2} />
          </div>
        </div>
        <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 text-center">
          <p className="label mb-1 text-brand-300">Your Pick</p>
          <p className="text-xl font-bold text-text-primary">{pickLabel}</p>
        </div>
        <p className="text-center text-xs text-text-muted">
          You can change your prediction until kickoff.
        </p>
        {errorMessage && (
          <p className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-center text-xs text-accent-red">
            {errorMessage}
          </p>
        )}
      </div>
    </Modal>
  );
}

function TeamCell({ team }: { team: ApiFixtureTeam }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <img
        src={`/assets/team-logos/${team.logo}`}
        alt={team.team_name}
        className="h-12 w-12 object-contain"
      />
      <span className="text-sm font-semibold">{truncateTeamName(team.team_name)}</span>
    </div>
  );
}
