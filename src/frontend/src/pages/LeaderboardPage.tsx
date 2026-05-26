import { useEffect, useMemo, useState } from 'react';
import { Clock, Trophy, Globe2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { TopThree } from '@/components/leaderboard/TopThree';
import {
  LeaderboardList,
  YouRow,
} from '@/components/leaderboard/LeaderboardList';
import { LEADERBOARDS } from '@/data/leaderboard';
import type { LeaderboardScope } from '@/types';

const REFRESH_SECONDS = 5 * 60 + 34;

export function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>('tournament');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : REFRESH_SECONDS));
    }, 1000);
    return () => { window.clearInterval(t); };
  }, []);

  const entries = LEADERBOARDS[scope];
  const top10 = useMemo(() => entries.filter((e) => !e.isYou).slice(0, 10), [
    entries,
  ]);
  const you = useMemo(() => entries.find((e) => e.isYou), [entries]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

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

      <TopThree entries={top10} />

      <LeaderboardList entries={top10.slice(3)} />

      <YouRow entry={you} />

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
