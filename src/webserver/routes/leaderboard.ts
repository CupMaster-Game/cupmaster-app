import { Hono } from 'hono';
import {
  fetchOverallLeaderboard,
  fetchActiveLeaderboard,
  type LeaderboardEntry,
} from '../../db/leaderboard.ts';
import { makeSmartCached } from '../../utils/smart-cache.ts';
import { authMiddleware, type AuthEnv } from '../middleware/auth.ts';

const TOP_N = 50;

const getCachedLeaderboards = makeSmartCached(
  async () => {
    const [active, overall] = await Promise.all([
      fetchActiveLeaderboard(),
      fetchOverallLeaderboard(),
    ]);
    return { active, overall };
  },
  { cacheSeconds: 10, autoRefresh: true, fileBackupName: 'leaderboard' }
);

function findMyRank<T extends LeaderboardEntry>(list: T[], userId: string): T | null {
  return list.find((e) => e.user_id === userId) ?? null;
}

export const leaderboardRoutes = new Hono<AuthEnv>().use(authMiddleware).get('/', async (c) => {
  const { user_id } = c.var.user;

  const cached = await getCachedLeaderboards();
  const activeList: LeaderboardEntry[] = cached?.active ?? [];
  const overallList: LeaderboardEntry[] = cached?.overall ?? [];

  return c.json({
    active: {
      top: activeList.slice(0, TOP_N),
      my_rank: findMyRank(activeList, user_id),
    },
    overall: {
      top: overallList.slice(0, TOP_N),
      my_rank: findMyRank(overallList, user_id),
    },
  });
});
