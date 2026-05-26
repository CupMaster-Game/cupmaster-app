import { Bell, Crown, Minus, Check, X } from 'lucide-react';
import type { Match, MatchOutcome, MatchPrediction } from '@/types';
import { getTeam } from '@/data/teams';
import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { formatTime } from '@/lib/date';
import { cn } from '@/lib/cn';

interface MatchCardProps {
  match: Match;
  prediction?: MatchPrediction;
  onPredictClick?: (match: Match, pick: MatchOutcome) => void;
}

export function MatchCard({ match, prediction, onPredictClick }: MatchCardProps) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const kickoff = new Date(match.kickoff);
  const isFinished = match.status === 'finished';
  const actualOutcome: MatchOutcome | null =
    isFinished && match.homeScore !== null && match.awayScore !== null
      ? match.homeScore > match.awayScore
        ? 'home'
        : match.homeScore < match.awayScore
          ? 'away'
          : 'draw'
      : null;
  const wasCorrect =
    prediction && actualOutcome ? prediction.pick === actualOutcome : null;

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 px-4 pt-4">
        <div className="text-sm font-semibold text-text-secondary">
          {isFinished ? (
            <span className="text-brand-400">FT</span>
          ) : (
            formatTime(kickoff)
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-1 items-center justify-end gap-2 text-right">
            <span className="text-sm font-semibold leading-tight">
              {home.name}
            </span>
            <Flag code={home.code} />
          </div>
          <div className="flex w-16 flex-col items-center text-center">
            {match.group && (
              <span className="text-[10px] uppercase tracking-wider text-text-muted">
                Group {match.group}
              </span>
            )}
            <span
              className={cn(
                'text-base font-bold',
                isFinished ? 'text-text-primary' : 'text-text-muted',
              )}
            >
              {isFinished
                ? `${match.homeScore ?? '-'} - ${match.awayScore ?? '-'}`
                : 'VS'}
            </span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Flag code={away.code} />
            <span className="text-sm font-semibold leading-tight">
              {away.name}
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
          label={`${home.name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          color="brand"
          active={prediction?.pick === 'home'}
          actual={actualOutcome === 'home'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'home' ? wasCorrect : null}
          disabled={isFinished}
          onClick={() => onPredictClick?.(match, 'home')}
        />
        <PickButton
          label="Draw"
          icon={<Minus className="h-3.5 w-3.5" />}
          color="neutral"
          active={prediction?.pick === 'draw'}
          actual={actualOutcome === 'draw'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'draw' ? wasCorrect : null}
          disabled={isFinished}
          onClick={() => onPredictClick?.(match, 'draw')}
        />
        <PickButton
          label={`${away.name} Win`}
          icon={<Crown className="h-3.5 w-3.5" />}
          color="blue"
          active={prediction?.pick === 'away'}
          actual={actualOutcome === 'away'}
          finished={isFinished}
          wasCorrect={prediction?.pick === 'away' ? wasCorrect : null}
          disabled={isFinished}
          onClick={() => onPredictClick?.(match, 'away')}
        />
      </div>
    </Card>
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

  // Result-state overrides (finished match)
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
