import { sql } from './index.ts';

// ---------------------------------------------------------------------------
// Row types
// postgres.js: BIGINT → string, NUMERIC → string, INT → number.
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  address: string;
  total_score: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// Queries — each returns the FULL sorted list so callers can both slice the
// top-N and look up any user's rank without a second query.
// ---------------------------------------------------------------------------

export async function fetchActiveLeaderboard(): Promise<LeaderboardEntry[]> {
  return sql<LeaderboardEntry[]>`
    SELECT user_id,
           name,
           address,
           total_score,
           RANK() OVER (ORDER BY total_score DESC)::int AS rank
    FROM (
      SELECT u.user_id,
             u.name,
             u.address,
             SUM(gpr.score)::int AS total_score
      FROM   game_plays gp
      JOIN   game_play_results gpr ON gpr.game_play_id = gp.game_play_id
      JOIN   tournaments t ON t.tournament_id = gp.tournament_id
      JOIN   users_with_data u ON u.user_id = gp.user_id
      WHERE  t.tournament_start_date <= now() AND t.tournament_end_date >= now()
        AND  NOT u.is_banned
      GROUP BY u.user_id, u.name, u.address
    ) t
    ORDER BY rank, user_id
  `;
}

export async function fetchOverallLeaderboard(): Promise<LeaderboardEntry[]> {
  return sql<LeaderboardEntry[]>`
    SELECT u.user_id,
           u.name,
           u.address,
           un.total_score::int AS total_score,
           RANK() OVER (ORDER BY un.total_score DESC)::int AS rank
    FROM   user_numbers un
    JOIN   users_with_data u ON u.user_id = un.user_id
    WHERE  un.total_score > 0
      AND  NOT u.is_banned
    ORDER BY rank, u.user_id
  `;
}
