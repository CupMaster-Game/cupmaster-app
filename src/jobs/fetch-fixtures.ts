import config from '../config.ts';
import { sql } from '../db/index.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob.
export const FETCH_FIXTURES_INTERVAL_MS = 10 * 60 * 1000;

const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;

// match_schedules was seeded with venue_city values that override the API.
// Mirrors scripts/world-cup-2026-overrides.ts — keep in sync if either side
// changes. Without these the time + venue_city join misses every US/Canada
// fixture (the API leaves their venue.city null) and Estadio Akron (API
// returns "Zapopan", FIFA brands it "Guadalajara").
const VENUE_NAME_BY_API_FIXTURE_ID: Record<number, string> = {
  1489373: "Levi's Stadium",
  1489376: 'AT&T Stadium',
  1489382: "Levi's Stadium",
  1489384: 'AT&T Stadium',
  1539006: "Levi's Stadium",
  1489399: 'AT&T Stadium',
  1489400: "Levi's Stadium",
  1539011: 'AT&T Stadium',
  1489411: "Levi's Stadium",
  1489421: 'AT&T Stadium',
};
const CITY_BY_VENUE_NAME: Record<string, string> = {
  'Mercedes-Benz Stadium': 'Atlanta',
  'Gillette Stadium': 'Foxborough',
  'AT&T Stadium': 'Arlington',
  'NRG Stadium': 'Houston',
  'Arrowhead Stadium': 'Kansas City',
  'SoFi Stadium': 'Inglewood',
  'Hard Rock Stadium': 'Miami Gardens',
  'MetLife Stadium': 'East Rutherford',
  'Lincoln Financial Field': 'Philadelphia',
  "Levi's Stadium": 'Santa Clara',
  'Lumen Field': 'Seattle',
  'BMO Field': 'Toronto',
  'BC Place': 'Vancouver',
  'Estadio Akron': 'Guadalajara',
  'Estadio Azteca': 'Mexico City',
  'Estadio BBVA': 'Monterrey',
};

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

function resolveVenueCity(fx: ApiFixtureEntry): string | null {
  const venueName = VENUE_NAME_BY_API_FIXTURE_ID[fx.fixture.id] ?? fx.fixture.venue.name;
  const overrideCity = venueName ? CITY_BY_VENUE_NAME[venueName] : undefined;
  return overrideCity ?? fx.fixture.venue.city;
}

/**
 * Fetches the World Cup 2026 fixture list from api-football and inserts any
 * fixture not already in the `fixtures` table. Matching to match_schedules
 * is by (match_time, venue_city); team IDs are resolved via teams.api_team_id.
 */
export async function runFetchFixturesJob(): Promise<void> {
  const apiFixtures = await fetchApiFixtures();

  const existing = await sql<{ api_fixture_id: number }[]>`
    SELECT api_fixture_id FROM fixtures
  `;
  const existingIds = new Set(existing.map((r) => r.api_fixture_id));

  let inserted = 0;
  for (const fx of apiFixtures) {
    if (existingIds.has(fx.fixture.id)) continue;

    const apiFixtureId = String(fx.fixture.id);
    const venueCity = resolveVenueCity(fx);
    if (!venueCity) {
      console.warn(`fetch-fixtures: fixture ${apiFixtureId} has no resolvable venue city`);
      continue;
    }

    const rows = await sql<{ match_number: number }[]>`
      INSERT INTO fixtures (api_fixture_id, match_number, team1_id, team2_id)
      SELECT ${fx.fixture.id}, ms.match_number, t1.team_id, t2.team_id
      FROM   match_schedules ms
      JOIN   teams t1 ON t1.api_team_id = ${fx.teams.home.id}
      JOIN   teams t2 ON t2.api_team_id = ${fx.teams.away.id}
      WHERE  ms.match_time = ${fx.fixture.date}::timestamptz
      AND    ms.venue_city = ${venueCity}
      AND    NOT EXISTS (SELECT 1 FROM fixtures f WHERE f.match_number = ms.match_number)
      RETURNING match_number
    `;
    const matched = rows[0];
    if (!matched) {
      console.warn(
        `fetch-fixtures: no match_schedule for fixture ${apiFixtureId} (${fx.fixture.date} @ ${venueCity})`
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
