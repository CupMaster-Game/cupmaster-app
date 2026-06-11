import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/date';
import { truncateTeamName } from '@/lib/team';
import type { ApiFixture, ApiFixtureTeam, MatchOutcome, MatchPrediction } from '@/types';
import { Check, Crown, Minus, X } from 'lucide-react';

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
  // Lock predictions once kickoff has passed, even if the status hasn't yet
  // flipped to live/finished. The backend enforces the same rule.
  const hasStarted = isFinished || isLive || kickoff.getTime() <= Date.now();
  const actualOutcome: MatchOutcome | null =
    isFinished && fixture.team1_score !== null && fixture.team2_score !== null
      ? fixture.team1_score > fixture.team2_score
        ? 'team1'
        : fixture.team1_score < fixture.team2_score
          ? 'team2'
          : 'draw'
      : null;
  const wasCorrect = prediction && actualOutcome ? prediction.pick === actualOutcome : null;
  const group = fixtureGroup(fixture);
  const hasTeams = team1 !== null && team2 !== null;
  const team1Name = team1 ? truncateTeamName(team1.team_name) : 'TBD';
  const team2Name = team2 ? truncateTeamName(team2.team_name) : 'TBD';
  const statusLabel = fixture.status_short ?? (isLive ? 'LIVE' : 'FT');
  // Team currently ahead — the winner once finished, the live leader otherwise.
  // null on a draw (or before any score exists).
  const leader: MatchOutcome | null =
    (isFinished || isLive) && fixture.team1_score !== null && fixture.team2_score !== null
      ? fixture.team1_score > fixture.team2_score
        ? 'team1'
        : fixture.team1_score < fixture.team2_score
          ? 'team2'
          : null
      : null;

  return (
    <Card className="relative overflow-hidden">
      <span
        className={cn(
          'absolute left-0 top-0 rounded-br-lg border-b border-r border-border-default bg-bg-elevated px-4 py-0.5 text-[11px] font-semibold text-text-secondary'
        )}
      >
        {formatTime(kickoff)}
      </span>
      {isLive && (
        <span className="absolute right-0 top-0 flex items-center gap-1.5 rounded-bl-lg border-b border-l border-border-default bg-bg-elevated px-3 py-0.5 text-[11px] font-semibold text-accent-red">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-red" />
          </span>
          LIVE
        </span>
      )}
      {isFinished && (
        <span className="absolute right-0 top-0 flex items-center gap-1.5 rounded-bl-lg border-b border-l border-border-default bg-bg-elevated px-3 py-0.5 text-[11px] font-semibold text-brand-400">
          FINISHED
        </span>
      )}
      <div className="flex items-center gap-3 px-1 pt-6">
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          {leader === 'team1' && <Crown className="h-3.5 w-3.5 shrink-0 text-brand-400" />}
          <span
            className={cn(
              'text-sm leading-tight',
              leader === 'team1' && 'font-bold text-brand-300'
            )}
          >
            {team1Name}
          </span>
          <TeamLogo team={team1} />
        </div>
        <div className="flex w-16 flex-col items-center text-center">
          {group && (
            <span className="text-[10px] uppercase tracking-wider text-text-muted">{group}</span>
          )}
          <span
            className={cn(
              'text-base font-bold',
              isFinished || isLive ? 'text-text-primary' : 'text-text-muted'
            )}
          >
            {isFinished || isLive
              ? `${fixture.team1_score ?? '-'} - ${fixture.team2_score ?? '-'}`
              : 'VS'}
          </span>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <TeamLogo team={team2} />
          <span
            className={cn(
              'text-sm leading-tight',
              leader === 'team2' && 'font-bold text-brand-300'
            )}
          >
            {team2Name}
          </span>
          {leader === 'team2' && <Crown className="h-3.5 w-3.5 shrink-0 text-brand-400" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 pt-3">
        <PickButton
          label={`${team1Name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          active={prediction?.pick === 'team1'}
          actual={actualOutcome === 'team1'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'team1' ? wasCorrect : null}
          disabled={hasStarted || !hasTeams || prediction?.pick === 'team1'}
          onClick={() => onPredictClick?.(fixture, 'team1')}
        />
        <PickButton
          label="Draw"
          icon={<Minus className="h-3.5 w-3.5" />}
          active={prediction?.pick === 'draw'}
          actual={actualOutcome === 'draw'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'draw' ? wasCorrect : null}
          disabled={hasStarted || !hasTeams || prediction?.pick === 'draw'}
          onClick={() => onPredictClick?.(fixture, 'draw')}
        />
        <PickButton
          label={`${team2Name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          active={prediction?.pick === 'team2'}
          actual={actualOutcome === 'team2'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'team2' ? wasCorrect : null}
          disabled={hasStarted || !hasTeams || prediction?.pick === 'team2'}
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
  active,
  actual,
  finished,
  wasCorrect,
  disabled,
  onClick,
}: PickButtonProps) {
  // Resting/unpicked style is always the faint neutral look (matches the
  // draw button). Picked state overrides background + border + text below.
  const restingStyle = 'border-border-default bg-bg-subtle text-text-secondary';

  let stateStyle = restingStyle;
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
      stateStyle = `${restingStyle} opacity-60`;
    }
  } else if (active) {
    stateStyle = 'border-accent-blue bg-accent-blue/30 text-text-primary shadow-glow-soft';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all active:scale-[0.98]',
        stateStyle,
        disabled && 'cursor-not-allowed'
      )}
    >
      {statusIcon ?? icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
