import { makeSmartCached } from '../utils/smart-cache.ts';
import { sql } from './index.ts';

// Per-team standing as exposed to the client. BIGINT team_id comes back as a
// string from postgres.js. group_name is joined in from the teams table.
export interface StandingView {
  team_id: string;
  group_name: string;
  rank: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals_for: number;
  goals_against: number;
  goals_diff: number;
  points: number;
}

async function fetchAllStandings(): Promise<StandingView[]> {
  return sql<StandingView[]>`
    SELECT s.team_id,
           t.group_name,
           s.rank,
           s.played,
           s.win,
           s.draw,
           s.lose,
           s.goals_for,
           s.goals_against,
           s.goals_diff,
           s.points
    FROM   team_standings s
    JOIN   teams t ON t.team_id = s.team_id
    ORDER BY t.group_name, s.rank
  `;
}

// Standings change only after a match finishes; the fetch-standings job already
// gates API calls on that. A short cache keeps the public endpoint cheap.
export const getCachedStandings = makeSmartCached(fetchAllStandings, {
  cacheSeconds: 30,
  autoRefresh: true,
});

/**
 * True when at least one fixture result was recorded within the given interval
 * (e.g. '1 hour'). fixture_results is insert-only and its id encodes the insert
 * time, so `date_from_id` gives us "recently finished" without an extra column.
 * The fetch-standings job uses this to skip the API call when nothing changed.
 */
export async function hasRecentlyFinishedMatch(interval: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM fixture_results
      WHERE date_from_id(fixture_result_id) > now() - ${interval}::interval
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

export interface StandingUpsert {
  team_id: string;
  rank: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals_for: number;
  goals_against: number;
  goals_diff: number;
  points: number;
}

/**
 * Upserts a team's standing row, but only writes when something actually
 * changed — so unchanged refreshes are no-ops. Returns true if a row was
 * inserted/updated.
 */
export async function upsertTeamStandingIfChanged(s: StandingUpsert): Promise<boolean> {
  const rows = await sql`
    INSERT INTO team_standings
      (team_id, rank, played, win, draw, lose, goals_for, goals_against, goals_diff, points, last_updated)
    VALUES
      (${s.team_id}, ${s.rank}, ${s.played}, ${s.win}, ${s.draw},
       ${s.lose}, ${s.goals_for}, ${s.goals_against}, ${s.goals_diff}, ${s.points}, now())
    ON CONFLICT (team_id) DO UPDATE
      SET rank          = EXCLUDED.rank,
          played        = EXCLUDED.played,
          win           = EXCLUDED.win,
          draw          = EXCLUDED.draw,
          lose          = EXCLUDED.lose,
          goals_for     = EXCLUDED.goals_for,
          goals_against = EXCLUDED.goals_against,
          goals_diff    = EXCLUDED.goals_diff,
          points        = EXCLUDED.points,
          last_updated  = EXCLUDED.last_updated
      WHERE team_standings.rank          IS DISTINCT FROM EXCLUDED.rank
         OR team_standings.played        IS DISTINCT FROM EXCLUDED.played
         OR team_standings.win           IS DISTINCT FROM EXCLUDED.win
         OR team_standings.draw          IS DISTINCT FROM EXCLUDED.draw
         OR team_standings.lose          IS DISTINCT FROM EXCLUDED.lose
         OR team_standings.goals_for     IS DISTINCT FROM EXCLUDED.goals_for
         OR team_standings.goals_against IS DISTINCT FROM EXCLUDED.goals_against
         OR team_standings.goals_diff    IS DISTINCT FROM EXCLUDED.goals_diff
         OR team_standings.points        IS DISTINCT FROM EXCLUDED.points
    RETURNING team_id
  `;
  return rows.length > 0;
}

/** Maps api_team_id -> team_id (BIGINT as string) for resolving API standings. */
export async function getTeamIdByApiId(): Promise<Map<number, string>> {
  const rows = await sql<{ api_team_id: number; team_id: string }[]>`
    SELECT api_team_id, team_id FROM teams
  `;
  return new Map(rows.map((r) => [r.api_team_id, r.team_id]));
}
