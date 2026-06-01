import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateScroller } from '@/components/fixture/DateScroller';
import { MatchCard } from '@/components/fixture/MatchCard';
import { PredictionConfirmModal } from '@/components/fixture/PredictionConfirmModal';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import {
  formatLongDate,
  getRelativeDayLabel,
  isSameDay,
  startOfDay,
} from '@/lib/date';
import { usePredictions } from '@/hooks/usePredictions';
import { cn } from '@/lib/cn';
import type { ApiFixture, MatchOutcome, MatchPrediction } from '@/types';

export function FixturePage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  // Before the World Cup kicks off, default the view to opening day so the
  // user lands on the first match instead of an empty pre-tournament day.
  const TOURNAMENT_START = useMemo(() => new Date(2026, 5, 11), []);
  const [selected, setSelected] = useState<Date>(
    today < TOURNAMENT_START ? TOURNAMENT_START : today
  );
  const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    fixture: ApiFixture;
    pick: MatchOutcome;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { predictions, submitPrediction } = usePredictions();

  useEffect(() => {
    let cancelled = false;
    api.fixtures
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status.toString()}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFixtures(data.fixtures);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[FixturePage] failed to load fixtures', err);
        setError('Could not load fixtures. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const predictionByMatchNumber = useMemo(() => {
    const map: Record<string, MatchPrediction> = {};
    for (const p of predictions.match_predictions) {
      map[String(p.match_number)] = {
        matchId: String(p.match_number),
        pick: p.result,
        predictedAt: p.predicted_at,
      };
    }
    return map;
  }, [predictions.match_predictions]);

  const relativeLabel = getRelativeDayLabel(selected, today);
  const longDate = formatLongDate(selected);
  const headerLabel = relativeLabel
    ? `${relativeLabel}, ${longDate.split(', ')[1] ?? longDate}`
    : longDate;

  const todayFixtures = useMemo(() => {
    return fixtures
      .filter((f) => isSameDay(new Date(f.match_time), selected))
      .sort((a, b) => a.match_time.localeCompare(b.match_time));
  }, [fixtures, selected]);

  const dateRange = useMemo(() => {
    if (fixtures.length === 0) return { before: undefined, after: undefined };
    const DAY_MS = 1000 * 60 * 60 * 24;
    const todayMs = today.getTime();
    let min = todayMs;
    let max = todayMs;
    for (const f of fixtures) {
      const t = startOfDay(new Date(f.match_time)).getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return {
      before: Math.max(7, Math.ceil((todayMs - min) / DAY_MS)),
      after: Math.max(14, Math.ceil((max - todayMs) / DAY_MS)),
    };
  }, [fixtures, today]);

  const isOnToday = isSameDay(selected, today);

  async function handleConfirm() {
    if (!pending) return;
    setSubmitting(true);
    setSubmitError(null);
    const matchNumber = pending.fixture.match_number;
    const hasExisting = predictionByMatchNumber[String(matchNumber)] !== undefined;
    const result = await submitPrediction(
      {
        type: 'match_prediction',
        data: { match_number: matchNumber, result: pending.pick },
      },
      hasExisting ? 'submitChange' : 'submit'
    );
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setPending(null);
  }

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
      <DateScroller
        selected={selected}
        onSelect={setSelected}
        rangeBefore={dateRange.before}
        rangeAfter={dateRange.after}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-400">
          <CalendarDays className="h-4 w-4" />
          {headerLabel}
        </div>
        {loading && (
          <Card className="px-4 py-6 text-center text-sm text-text-muted">
            Loading fixtures…
          </Card>
        )}
        {!loading && error && (
          <Card className="px-4 py-6 text-center text-sm text-accent-red">
            {error}
          </Card>
        )}
        {!loading && !error && todayFixtures.length === 0 && (
          <Card className="px-4 py-6 text-center text-sm text-text-muted">
            No matches scheduled for this day.
          </Card>
        )}
        {!loading && !error &&
          todayFixtures.map((f) => (
            <MatchCard
              key={f.match_number}
              fixture={f}
              prediction={predictionByMatchNumber[String(f.match_number)]}
              onPredictClick={(fixture, pick) => {
                setSubmitError(null);
                setPending({ fixture, pick });
              }}
            />
          ))}
      </div>

      <PredictionConfirmModal
        fixture={pending?.fixture ?? null}
        pick={pending?.pick ?? null}
        open={pending !== null}
        submitting={submitting}
        errorMessage={submitError}
        onClose={() => {
          if (submitting) return;
          setPending(null);
          setSubmitError(null);
        }}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    </div>
  );
}
