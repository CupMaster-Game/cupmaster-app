import { Bell, Crown, Minus, Check, X } from 'lucide-react';
import type {
  ApiFixture,
  ApiFixtureTeam,
  MatchOutcome,
  MatchPrediction,
} from '@/types';
import { Card } from '@/components/ui/Card';
import { formatTime } from '@/lib/date';
import { cn } from '@/lib/cn';

interface MatchCardProps {
  fixture: ApiFixture;
  prediction?: MatchPrediction;
  onPredictClick?: (fixture: ApiFixture, pick: MatchOutcome) => void;
}

function fixtureGroup(fixture: ApiFixture): string | null {
  if (fixture.round_type !== 'group') return null;
  const group = fixture.team1?.group_name ?? fixture.team2?.group_name;
  return group ?? null;
}

export function MatchCard({ fixture, prediction, onPredictClick }: MatchCardProps) {
  const team1 = fixture.team1;
  const team2 = fixture.team2;
  const kickoff = new Date(fixture.match_time);
  const isFinished = fixture.status === 'finished';
  const isLive = fixture.status === 'live';
  const actualOutcome: MatchOutcome | null =
    isFinished && fixture.team1_score !== null && fixture.team2_score !== null
      ? fixture.team1_score > fixture.team2_score
        ? 'team1'
        : fixture.team1_score < fixture.team2_score
          ? 'team2'
          : 'draw'
      : null;
  const wasCorrect =
    prediction && actualOutcome ? prediction.pick === actualOutcome : null;
  const group = fixtureGroup(fixture);
  const hasTeams = team1 !== null && team2 !== null;
  const team1Name = team1?.team_name ?? 'TBD';
  const team2Name = team2?.team_name ?? 'TBD';
  const statusLabel = fixture.status_short ?? (isLive ? 'LIVE' : 'FT');

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 px-4 pt-4">
        <div className="text-sm font-semibold text-text-secondary">
          {isFinished || isLive ? (
            <span className={cn(isLive ? 'text-accent-red' : 'text-brand-400')}>
              {statusLabel}
            </span>
          ) : (
            formatTime(kickoff)
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-1 items-center justify-end gap-2 text-right">
            <span className="text-sm font-semibold leading-tight">
              {team1Name}
            </span>
            <TeamLogo team={team1} />
          </div>
          <div className="flex w-16 flex-col items-center text-center">
            {group && (
              <span className="text-[10px] uppercase tracking-wider text-text-muted">
                {group}
              </span>
            )}
            <span
              className={cn(
                'text-base font-bold',
                isFinished || isLive ? 'text-text-primary' : 'text-text-muted',
              )}
            >
              {isFinished || isLive
                ? `${fixture.team1_score ?? '-'} - ${fixture.team2_score ?? '-'}`
                : 'VS'}
            </span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <TeamLogo team={team2} />
            <span className="text-sm font-semibold leading-tight">
              {team2Name}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Notify"
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 pt-3">
        <PickButton
          label={`${team1Name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          color="brand"
          active={prediction?.pick === 'team1'}
          actual={actualOutcome === 'team1'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'team1' ? wasCorrect : null}
          disabled={isFinished || isLive || !hasTeams}
          onClick={() => onPredictClick?.(fixture, 'team1')}
        />
        <PickButton
          label="Draw"
          icon={<Minus className="h-3.5 w-3.5" />}
          color="neutral"
          active={prediction?.pick === 'draw'}
          actual={actualOutcome === 'draw'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'draw' ? wasCorrect : null}
          disabled={isFinished || isLive || !hasTeams}
          onClick={() => onPredictClick?.(fixture, 'draw')}
        />
        <PickButton
          label={`${team2Name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          color="blue"
          active={prediction?.pick === 'team2'}
          actual={actualOutcome === 'team2'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'team2' ? wasCorrect : null}
          disabled={isFinished || isLive || !hasTeams}
          onClick={() => onPredictClick?.(fixture, 'team2')}
        />
      </div>
    </Card>
  );
}

function TeamLogo({ team }: { team: ApiFixtureTeam | null }) {
  if (!team) {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-bold text-text-muted"
        aria-label="Team to be determined"
      >
        ?
      </span>
    );
  }
  return (
    <img
      src={`/assets/team-logos/${team.logo}`}
      alt={team.team_name}
      className="h-6 w-6 shrink-0 object-contain"
    />
  );
}

interface PickButtonProps {
  label: string;
  icon: React.ReactNode;
  color: 'brand' | 'blue' | 'neutral';
  active: boolean;
  actual: boolean;
  finished: boolean;
  wasCorrect: boolean | null;
  disabled?: boolean;
  onClick: () => void;
}

function PickButton({
  label,
  icon,
  color,
  active,
  actual,
  finished,
  wasCorrect,
  disabled,
  onClick,
}: PickButtonProps) {
  const colorStyle =
    color === 'brand'
      ? 'border-brand-500/40 text-brand-400'
      : color === 'blue'
        ? 'border-accent-blue/40 text-accent-blue'
        : 'border-border-default text-text-secondary';

  let stateStyle = '';
  let statusIcon: React.ReactNode = null;

  if (finished) {
    if (active && wasCorrect === true) {
      stateStyle = 'border-brand-500 bg-brand-500/15 text-brand-300';
      statusIcon = <Check className="h-3.5 w-3.5" />;
    } else if (active && wasCorrect === false) {
      stateStyle = 'border-accent-red/60 bg-accent-red/10 text-accent-red';
      statusIcon = <X className="h-3.5 w-3.5" />;
    } else if (actual) {
      stateStyle = 'border-brand-500/40 bg-brand-500/5 text-text-secondary';
    } else {
      stateStyle = 'opacity-60';
    }
  } else if (active) {
    stateStyle =
      color === 'brand'
        ? 'border-brand-500 bg-brand-500/15 text-brand-300 shadow-glow-soft'
        : color === 'blue'
          ? 'border-accent-blue bg-accent-blue/15 text-accent-blue'
          : 'border-border-strong bg-bg-elevated text-text-primary';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border bg-bg-subtle px-2 py-2.5 text-xs font-semibold transition-all active:scale-[0.98]',
        colorStyle,
        stateStyle,
        disabled && 'cursor-not-allowed',
      )}
    >
      {statusIcon ?? icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
