import { useMemo, useState } from 'react';
import { CalendarDays, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateScroller } from '@/components/fixture/DateScroller';
import { MatchCard } from '@/components/fixture/MatchCard';
import { PredictionConfirmModal } from '@/components/fixture/PredictionConfirmModal';
import { Card } from '@/components/ui/Card';
import { matchesOnDay } from '@/data/matches';
import {
  formatLongDate,
  getRelativeDayLabel,
  isSameDay,
  startOfDay,
} from '@/lib/date';
import { useAppStore } from '@/store/AppStore';
import { cn } from '@/lib/cn';
import type { Match, MatchOutcome } from '@/types';

export function FixturePage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState<Date>(today);
  const [pending, setPending] = useState<{
    match: Match;
    pick: MatchOutcome;
  } | null>(null);
  const { predictions, setMatchPrediction } = useAppStore();

  const relativeLabel = getRelativeDayLabel(selected, today);
  const longDate = formatLongDate(selected);
  const headerLabel = relativeLabel
    ? `${relativeLabel}, ${longDate.split(', ')[1] ?? longDate}`
    : longDate;

  const todayMatches = matchesOnDay(selected);
  const isOnToday = isSameDay(selected, today);

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Fixtures"
        action={
          <button
            type="button"
            onClick={() => { setSelected(today); }}
            disabled={isOnToday}
            aria-label="Jump to today"
            title="Jump to today"
            className={cn(
              'rounded-xl border p-2 transition-colors',
              isOnToday
                ? 'border-border-subtle bg-bg-surface text-text-faint cursor-default'
                : 'border-brand-500/40 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20',
            )}
          >
            <CalendarCheck className="h-5 w-5" />
          </button>
        }
      />
      <DateScroller selected={selected} onSelect={setSelected} />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-400">
          <CalendarDays className="h-4 w-4" />
          {headerLabel}
        </div>
        {todayMatches.length === 0 && (
          <Card className="px-4 py-6 text-center text-sm text-text-muted">
            No matches scheduled for this day.
          </Card>
        )}
        {todayMatches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            prediction={predictions[m.id]}
            onPredictClick={(match, pick) => { setPending({ match, pick }); }}
          />
        ))}
      </div>

      <PredictionConfirmModal
        match={pending?.match ?? null}
        pick={pending?.pick ?? null}
        open={pending !== null}
        onClose={() => { setPending(null); }}
        onConfirm={() => {
          if (pending) {
            setMatchPrediction(pending.match.id, pending.pick);
            setPending(null);
          }
        }}
      />
    </div>
  );
}
