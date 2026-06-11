import { makeSmartCached } from '../utils/smart-cache.ts';
import { sql } from './index.ts';

export interface FixtureTeamInfo {
  team_id: string;
  team_name: string;
  country_code: string;
  logo: string;
  group_name: string;
}

export type FixtureStatus = 'scheduled' | 'live' | 'finished';

export interface FixtureView {
  match_number: number;
  fixture_id: string | null;
  match_time: string;
  round_type: 'group' | 'knockout';
  round: string;
  venue_name: string;
  venue_city: string;
  status: FixtureStatus;
  status_short: string | null;
  team1: FixtureTeamInfo | null;
  team2: FixtureTeamInfo | null;
  team1_score: number | null;
  team2_score: number | null;
}

interface QueryRow {
  match_number: number;
  fixture_id: string | null;
  match_time: Date;
  round_type: 'group' | 'knockout';
  round: string;
  venue_name: string;
  venue_city: string;
  team1_id: string | null;
  team1_name: string | null;
  team1_country_code: string | null;
  team1_logo: string | null;
  team1_group_name: string | null;
  team2_id: string | null;
  team2_name: string | null;
  team2_country_code: string | null;
  team2_logo: string | null;
  team2_group_name: string | null;
  final_status_short: string | null;
  final_team1_score: number | null;
  final_team2_score: number | null;
  live_status_short: string | null;
  live_team1_score: number | null;
  live_team2_score: number | null;
}

function buildTeam(
  id: string | null,
  name: string | null,
  code: string | null,
  logo: string | null,
  group: string | null
): FixtureTeamInfo | null {
  if (id === null || name === null || code === null || logo === null || group === null) {
    return null;
  }
  return { team_id: id, team_name: name, country_code: code, logo, group_name: group };
}

async function fetchAllFixtures(): Promise<FixtureView[]> {
  const rows = await sql<QueryRow[]>`
    SELECT ms.match_number,
           f.fixture_id,
           ms.match_time,
           ms.round_type,
           ms.round,
           ms.venue_name,
           ms.venue_city,
           t1.team_id        AS team1_id,
           t1.team_name      AS team1_name,
           t1.country_code   AS team1_country_code,
           t1.logo           AS team1_logo,
           t1.group_name     AS team1_group_name,
           t2.team_id        AS team2_id,
           t2.team_name      AS team2_name,
           t2.country_code   AS team2_country_code,
           t2.logo           AS team2_logo,
           t2.group_name     AS team2_group_name,
           fr.status_short   AS final_status_short,
           fr.team1_score    AS final_team1_score,
           fr.team2_score    AS final_team2_score,
           flr.status_short  AS live_status_short,
           flr.team1_score   AS live_team1_score,
           flr.team2_score   AS live_team2_score
    FROM   match_schedules ms
    LEFT JOIN fixtures             f   ON f.match_number = ms.match_number
    LEFT JOIN teams                t1  ON t1.team_id     = f.team1_id
    LEFT JOIN teams                t2  ON t2.team_id     = f.team2_id
    LEFT JOIN fixture_results      fr  ON fr.fixture_id  = f.fixture_id
    LEFT JOIN fixture_live_results flr ON flr.fixture_id = f.fixture_id
    ORDER BY ms.match_time, ms.match_number
  `;

  return rows.map<FixtureView>((r) => {
    const isFinished = r.final_status_short !== null;
    const isLive = !isFinished && r.live_status_short !== null && r.live_status_short !== 'NS';
    const status: FixtureStatus = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';

    const status_short = isFinished ? r.final_status_short : isLive ? r.live_status_short : null;

    const team1_score = isFinished ? r.final_team1_score : isLive ? r.live_team1_score : null;
    const team2_score = isFinished ? r.final_team2_score : isLive ? r.live_team2_score : null;

    return {
      match_number: r.match_number,
      fixture_id: r.fixture_id,
      match_time: r.match_time.toISOString(),
      round_type: r.round_type,
      round: r.round,
      venue_name: r.venue_name,
      venue_city: r.venue_city,
      status,
      status_short,
      team1: buildTeam(
        r.team1_id,
        r.team1_name,
        r.team1_country_code,
        r.team1_logo,
        r.team1_group_name
      ),
      team2: buildTeam(
        r.team2_id,
        r.team2_name,
        r.team2_country_code,
        r.team2_logo,
        r.team2_group_name
      ),
      team1_score,
      team2_score,
    };
  });
}

export const getCachedFixtures = makeSmartCached(fetchAllFixtures, {
  cacheSeconds: 30,
  autoRefresh: true,
});

// ---------------------------------------------------------------------------
// Live results ingestion (written by the fetch-live-results job)
// ---------------------------------------------------------------------------

export interface LiveCandidateFixture {
  fixture_id: string;
  api_fixture_id: number;
}

/**
 * Fixtures whose kickoff falls within ±2h of now and which haven't been
 * finalised yet. Used by the live-results job to decide whether any match is
 * (about to be) live — an empty result means "nothing to poll, skip".
 */
export async function getLiveCandidateFixtures(): Promise<LiveCandidateFixture[]> {
  return sql<LiveCandidateFixture[]>`
    SELECT f.fixture_id, f.api_fixture_id
    FROM   fixtures f
    JOIN   match_schedules ms ON ms.match_number = f.match_number
    WHERE  ms.match_time BETWEEN now() - interval '4 hours' AND now() + interval '4 hours'
    AND    NOT EXISTS (SELECT 1 FROM fixture_results fr WHERE fr.fixture_id = f.fixture_id)
  `;
}

/**
 * Upserts the single live row for a fixture, but only writes when the
 * (status, score) actually differs from what's stored — so unchanged polls are
 * no-ops. Returns true if a row was inserted/updated.
 */
export async function upsertLiveResultIfChanged(
  fixtureId: string,
  statusShort: string,
  team1Score: number,
  team2Score: number
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO fixture_live_results (fixture_id, status_short, team1_score, team2_score, last_updated)
    VALUES (${fixtureId}, ${statusShort}, ${team1Score}, ${team2Score}, now())
    ON CONFLICT (fixture_id) DO UPDATE
      SET status_short = EXCLUDED.status_short,
          team1_score  = EXCLUDED.team1_score,
          team2_score  = EXCLUDED.team2_score,
          last_updated = EXCLUDED.last_updated
      WHERE fixture_live_results.status_short IS DISTINCT FROM EXCLUDED.status_short
         OR fixture_live_results.team1_score  IS DISTINCT FROM EXCLUDED.team1_score
         OR fixture_live_results.team2_score  IS DISTINCT FROM EXCLUDED.team2_score
    RETURNING fixture_id
  `;
  return rows.length > 0;
}

/**
 * Records the final result for a completed fixture. No-op (returns false) if a
 * result already exists — fixture_results is insert-only.
 */
export async function insertFixtureResultIfAbsent(
  fixtureId: string,
  statusShort: string,
  team1Score: number,
  team2Score: number
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO fixture_results (fixture_id, status_short, team1_score, team2_score)
    VALUES (${fixtureId}, ${statusShort}, ${team1Score}, ${team2Score})
    ON CONFLICT (fixture_id) DO NOTHING
    RETURNING fixture_id
  `;
  return rows.length > 0;
}
