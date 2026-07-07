import config from '../config.ts';
import { sql } from '../db/index.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob.
export const FETCH_FIXTURES_INTERVAL_MS = 10 * 60 * 1000;

const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;

interface ApiFixtureEntry {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null; city: string | null };
  };
  teams: {
    home: { id: number };
    away: { id: number };
  };
}

async function fetchApiFixtures(): Promise<ApiFixtureEntry[]> {
  const url = new URL('/fixtures', config.FOOTBALL_DATA_API_BASE_URL);
  url.searchParams.set('league', String(LEAGUE_ID));
  url.searchParams.set('season', String(SEASON));
  const res = await fetch(url, {
    headers: { 'x-apisports-key': config.FOOTBALL_DATA_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`GET ${url.pathname} -> HTTP ${String(res.status)}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response: ApiFixtureEntry[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : typeof errs === 'object' && errs !== null && Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`GET ${url.pathname} -> API errors: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

/**
 * Fetches the World Cup 2026 fixture list from api-football and inserts any
 * fixture not already in the `fixtures` table. Matching to match_schedules
 * is by (match_time, venue_city); team IDs are resolved via teams.api_team_id.
 *
 * Fixtures are insert-only: a fixture's two teams don't change once set, and
 * knockout slots are simply inserted when their teams are first resolved. If
 * the API ever reports different teams for a fixture we've already stored we
 * log a warning (and leave the stored row untouched) rather than silently
 * diverging.
 */
export async function runFetchFixturesJob(): Promise<void> {
  const apiFixtures = await fetchApiFixtures();

  const existing = await sql<{ api_fixture_id: number }[]>`
    SELECT api_fixture_id FROM fixtures
  `;
  const existingIds = new Set(existing.map((r) => r.api_fixture_id));

  let inserted = 0;
  for (const fx of apiFixtures) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!(fx.teams?.away?.id > 0 && fx.teams?.home?.id)) {
      continue; // teams not decided yet (unresolved knockout slot)
    }

    const apiFixtureId = String(fx.fixture.id);

    if (existingIds.has(fx.fixture.id)) {
      // Already stored — warn if the API now reports different teams (a data
      // correction or home/away swap), since we deliberately don't update.
      const sameTeams = await sql`
        SELECT 1
        FROM   fixtures f
        JOIN   teams t1 ON t1.team_id = f.team1_id
        JOIN   teams t2 ON t2.team_id = f.team2_id
        WHERE  f.api_fixture_id = ${fx.fixture.id}
        AND    t1.api_team_id = ${fx.teams.home.id}
        AND    t2.api_team_id = ${fx.teams.away.id}
      `;
      if (sameTeams.length === 0) {
        console.warn(
          `fetch-fixtures: fixture ${apiFixtureId} teams changed on the API ` +
            `(home=${String(fx.teams.home.id)} away=${String(fx.teams.away.id)}); ` +
            `leaving stored teams unchanged`
        );
      }
      continue;
    }

    const rows = await sql<{ match_number: number }[]>`
      INSERT INTO fixtures (api_fixture_id, match_number, team1_id, team2_id)
      SELECT ${fx.fixture.id}, ms.match_number, t1.team_id, t2.team_id
      FROM   match_schedules ms
      JOIN   teams t1 ON t1.api_team_id = ${fx.teams.home.id}
      JOIN   teams t2 ON t2.api_team_id = ${fx.teams.away.id}
      WHERE  ms.match_time = ${fx.fixture.date}::timestamptz
      AND    NOT EXISTS (SELECT 1 FROM fixtures f WHERE f.match_number = ms.match_number)
      RETURNING match_number
    `;
    const matched = rows[0];
    if (!matched) {
      console.warn(
        `fetch-fixtures: no match_schedule for fixture ${apiFixtureId} (${fx.fixture.date})`
      );
      continue;
    }
    inserted++;
    console.log(
      `fetch-fixtures: inserted fixture ${apiFixtureId} -> match ${String(matched.match_number)}`
    );
  }

  if (inserted > 0) {
    console.log(`fetch-fixtures: ${String(inserted)} new fixtures inserted`);
  }
}
