import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Clock, Trophy, Globe2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { TopThree } from '@/components/leaderboard/TopThree';
import {
  LeaderboardList,
  YouRow,
} from '@/components/leaderboard/LeaderboardList';
import { getAuthedApi } from '@/lib/api';
import type { LeaderboardEntry, LeaderboardScope } from '@/types';

const REFRESH_SECONDS = 5 * 60 + 34;

interface ScopeData {
  top: LeaderboardEntry[];
  my_rank: LeaderboardEntry | null;
}

interface LeaderboardResponse {
  active: ScopeData;
  overall: ScopeData;
}

export function LeaderboardPage() {
  const { address } = useAccount();
  const [scope, setScope] = useState<LeaderboardScope>('tournament');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : REFRESH_SECONDS));
    }, 1000);
    return () => { window.clearInterval(t); };
  }, []);

  const authed = useMemo(() => getAuthedApi(address), [address]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    authed.leaderboard
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status.toString()}`);
        return await res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[LeaderboardPage] failed to load leaderboard', err);
        setError('Could not load leaderboard. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const scopeData = scope === 'tournament' ? data?.active : data?.overall;
  const entries = useMemo<LeaderboardEntry[]>(() => {
    if (!scopeData) return [];
    const list = scopeData.top.map((e) => ({
      ...e,
      isYou: e.user_id === scopeData.my_rank?.user_id,
    }));
    return list;
  }, [scopeData]);

  const top10 = useMemo(() => entries.slice(0, 10), [entries]);
  const you = useMemo<LeaderboardEntry | undefined>(() => {
    if (!scopeData?.my_rank) return undefined;
    const inTop = top10.find((e) => e.user_id === scopeData.my_rank?.user_id);
    if (inTop) return undefined;
    return { ...scopeData.my_rank, isYou: true };
  }, [scopeData, top10]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  const noAuthError = !authed
    ? 'Please sign in to view the leaderboard.'
    : null;
  const displayLoading = !noAuthError && loading;
  const displayError = noAuthError ?? error;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Leaderboard"
        subtitle="Compete with players around the world!"
      />

      <Tabs<LeaderboardScope>
        value={scope}
        onChange={setScope}
        options={[
          {
            value: 'tournament',
            label: 'Active Tournament',
            icon: <Trophy className="h-4 w-4" />,
          },
          {
            value: 'overall',
            label: 'Overall',
            icon: <Globe2 className="h-4 w-4" />,
          },
        ]}
      />

      {displayLoading && (
        <Card className="px-4 py-6 text-center text-sm text-text-muted">
          Loading leaderboard…
        </Card>
      )}
      {!displayLoading && displayError && (
        <Card className="px-4 py-6 text-center text-sm text-accent-red">
          {displayError}
        </Card>
      )}
      {!displayLoading && !displayError && entries.length === 0 && (
        <Card className="px-4 py-6 text-center text-sm text-text-muted">
          No players on the leaderboard yet.
        </Card>
      )}
      {!displayLoading && !displayError && entries.length > 0 && (
        <>
          <TopThree entries={top10} />
          <LeaderboardList entries={top10.slice(3)} />
          <YouRow entry={you} />
        </>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <Clock className="h-3.5 w-3.5" />
        Leaderboard updates in{' '}
        <span className="font-semibold text-brand-400">
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </p>
    </div>
  );
}
