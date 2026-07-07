/**
 * One-off backfill for penalty-shootout scores on already-recorded results.
 *
 * `fixture_results` is insert-only, so knockout matches that finished on
 * penalties *before* the team1_penalty/team2_penalty columns existed have NULL
 * shootout scores and their bracket winner can't be derived. This script
 * re-fetches those fixtures from api-football and fills in the penalty scores.
 *
 * Idempotent: it only looks at PEN results still missing a penalty score, and
 * only writes when the API actually returns one — so re-running is safe.
 *
 * Run (after `dotenv` vars are set):
 *   node --experimental-strip-types scripts/backfill-penalties.ts
 *
 * Requires env: DATABASE_URL, FOOTBALL_DATA_API_KEY
 *   (optional FOOTBALL_DATA_API_BASE_URL, defaults to api-sports v3).
 */

import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

loadDotenv();

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const API_BASE_URL = process.env.FOOTBALL_DATA_API_BASE_URL ?? 'https://v3.football.api-sports.io';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
if (!API_KEY) {
  console.error('FOOTBALL_DATA_API_KEY is not set');
  process.exit(1);
}

// api-sports caps the ?ids= filter at 20 fixtures per request.
const MAX_IDS_PER_REQUEST = 20;

interface ApiFixture {
  fixture: { id: number; status: { short: string } };
  score: { penalty: { home: number | null; away: number | null } };
}

async function fetchApiFixturesByIds(ids: number[]): Promise<ApiFixture[]> {
  const url = new URL('/fixtures', API_BASE_URL);
  url.searchParams.set('ids', ids.join('-'));
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY as string },
  });
  if (!res.ok) {
    throw new Error(`GET ${url.pathname} -> HTTP ${String(res.status)}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response: ApiFixture[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : typeof errs === 'object' && errs !== null && Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`GET ${url.pathname} -> API errors: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

async function main(): Promise<void> {
  const sql = postgres(DATABASE_URL as string, { max: 4 });
  try {
    const pending = await sql<{ fixture_id: string; api_fixture_id: number }[]>`
      SELECT f.fixture_id, f.api_fixture_id
      FROM   fixture_results fr
      JOIN   fixtures f ON f.fixture_id = fr.fixture_id
      WHERE  fr.status_short = 'PEN'
      AND    (fr.team1_penalty IS NULL OR fr.team2_penalty IS NULL)
    `;

    if (pending.length === 0) {
      console.log('backfill-penalties: nothing to do — no PEN results missing penalty scores');
      return;
    }

    console.log(`backfill-penalties: ${String(pending.length)} PEN result(s) missing penalties`);

    const fixtureIdByApiId = new Map(pending.map((r) => [r.api_fixture_id, r.fixture_id]));
    const apiIds = [...fixtureIdByApiId.keys()];

    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < apiIds.length; i += MAX_IDS_PER_REQUEST) {
      const batch = apiIds.slice(i, i + MAX_IDS_PER_REQUEST);
      const apiFixtures = await fetchApiFixturesByIds(batch);

      for (const fx of apiFixtures) {
        const fixtureId = fixtureIdByApiId.get(fx.fixture.id);
        if (!fixtureId) continue;

        const team1Penalty = fx.score.penalty.home;
        const team2Penalty = fx.score.penalty.away;
        if (team1Penalty === null || team2Penalty === null) {
          console.warn(
            `backfill-penalties: fixture ${String(fx.fixture.id)} has no penalty score on the API (status ${fx.fixture.status.short}); skipping`
          );
          skipped++;
          continue;
        }

        const rows = await sql`
          UPDATE fixture_results
          SET    team1_penalty = ${team1Penalty},
                 team2_penalty = ${team2Penalty}
          WHERE  fixture_id = ${fixtureId}
          AND    status_short = 'PEN'
          AND    (team1_penalty IS NULL OR team2_penalty IS NULL)
          RETURNING fixture_id
        `;
        if (rows.length > 0) {
          updated++;
          console.log(
            `backfill-penalties: fixture ${String(fx.fixture.id)} pens ${String(team1Penalty)}-${String(team2Penalty)}`
          );
        }
      }
    }

    console.log(
      `backfill-penalties: done — ${String(updated)} updated, ${String(skipped)} skipped`
    );
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('backfill-penalties: failed', err);
  process.exit(1);
});
