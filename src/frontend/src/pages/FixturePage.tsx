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
import { useAppStore } from '@/store/AppStore';
import { cn } from '@/lib/cn';
import type { ApiFixture, MatchOutcome } from '@/types';

function fixtureKey(fixture: ApiFixture): string {
  return String(fixture.match_number);
}

export function FixturePage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState<Date>(today);
  const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    fixture: ApiFixture;
    pick: MatchOutcome;
  } | null>(null);
  const { predictions, setMatchPrediction } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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
              key={fixtureKey(f)}
              fixture={f}
              prediction={predictions[fixtureKey(f)]}
              onPredictClick={(fixture, pick) => { setPending({ fixture, pick }); }}
            />
          ))}
      </div>

      <PredictionConfirmModal
        fixture={pending?.fixture ?? null}
        pick={pending?.pick ?? null}
        open={pending !== null}
        onClose={() => { setPending(null); }}
        onConfirm={() => {
          if (pending) {
            setMatchPrediction(fixtureKey(pending.fixture), pending.pick);
            setPending(null);
          }
        }}
      />
    </div>
  );
}
