import config from '../config.ts';
import {
  getLiveCandidateFixtures,
  insertFixtureResultIfAbsent,
  upsertLiveResultIfChanged,
} from '../db/fixtures.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob. Runs every
// minute, but returns immediately (no API call) when no match is in the live
// window, so off-match-day minutes are nearly free.
export const FETCH_LIVE_RESULTS_INTERVAL_MS = 60 * 1000;

// api-sports caps the ?ids= filter at 20 fixtures per request.
const MAX_IDS_PER_REQUEST = 20;

// api-sports status.short -> fixture_live_results.status_short
// (CHECK allows: NS, 1H, HT, 2H, ET, P, FT). Finished states collapse to FT.
// Statuses absent here (PST/CANC/SUSP/INT/ABD/...) aren't recorded.
const LIVE_STATUS_MAP: Record<string, string> = {
  NS: 'NS',
  '1H': '1H',
  HT: 'HT',
  '2H': '2H',
  ET: 'ET',
  BT: 'ET', // break time before/within extra time
  P: 'P',
  FT: 'FT',
  AET: 'FT',
  PEN: 'FT',
};

// api-sports statuses that mean the match is over.
// fixture_results.status_short CHECK allows exactly: FT, AET, PEN.
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

interface ApiLiveFixture {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
  // score.penalty holds the shootout result for PEN matches; null otherwise.
  score: { penalty: { home: number | null; away: number | null } };
}

async function fetchApiFixturesByIds(ids: number[]): Promise<ApiLiveFixture[]> {
  const url = new URL('/fixtures', config.FOOTBALL_DATA_API_BASE_URL);
  url.searchParams.set('ids', ids.join('-'));
  const res = await fetch(url, {
    headers: { 'x-apisports-key': config.FOOTBALL_DATA_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`GET ${url.pathname} -> HTTP ${String(res.status)}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response: ApiLiveFixture[]; errors?: unknown };
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
 * Polls api-football for the score/status of any fixture in the live window
 * (±2h of kickoff, not yet finalised). For each fixture it refreshes the
 * `fixture_live_results` row when the data changed, and writes the final
 * `fixture_results` row once the match is over. When no fixture is in the
 * window the job skips the API call entirely.
 */
export async function runFetchLiveResultsJob(): Promise<void> {
  const candidates = await getLiveCandidateFixtures();
  if (candidates.length === 0) return; // no live (or about-to-start) match → skip

  const fixtureIdByApiId = new Map(candidates.map((c) => [c.api_fixture_id, c.fixture_id]));
  const apiIds = [...fixtureIdByApiId.keys()];

  for (let i = 0; i < apiIds.length; i += MAX_IDS_PER_REQUEST) {
    const batch = apiIds.slice(i, i + MAX_IDS_PER_REQUEST);
    const apiFixtures = await fetchApiFixturesByIds(batch);

    for (const fx of apiFixtures) {
      const fixtureId = fixtureIdByApiId.get(fx.fixture.id);
      if (!fixtureId) continue;

      const apiStatus = fx.fixture.status.short;
      const liveStatus = LIVE_STATUS_MAP[apiStatus];
      if (!liveStatus) continue; // postponed / cancelled / suspended — nothing to record

      // Goals are null until kickoff; treat as 0-0.
      const team1Score = fx.goals.home ?? 0;
      const team2Score = fx.goals.away ?? 0;

      const changed = await upsertLiveResultIfChanged(
        fixtureId,
        liveStatus,
        team1Score,
        team2Score
      );
      if (changed) {
        console.log(
          `fetch-live-results: fixture ${String(fx.fixture.id)} ${liveStatus} ${String(team1Score)}-${String(team2Score)}`
        );
      }

      if (FINISHED_STATUSES.has(apiStatus)) {
        // Only shootout-decided matches carry a penalty score.
        const team1Penalty = apiStatus === 'PEN' ? (fx.score.penalty.home ?? null) : null;
        const team2Penalty = apiStatus === 'PEN' ? (fx.score.penalty.away ?? null) : null;
        const inserted = await insertFixtureResultIfAbsent(
          fixtureId,
          apiStatus,
          team1Score,
          team2Score,
          team1Penalty,
          team2Penalty
        );
        if (inserted) {
          const penaltySuffix =
            team1Penalty !== null && team2Penalty !== null
              ? ` (pens ${String(team1Penalty)}-${String(team2Penalty)})`
              : '';
          console.log(
            `fetch-live-results: fixture ${String(fx.fixture.id)} FINAL ${apiStatus} ${String(team1Score)}-${String(team2Score)}${penaltySuffix}`
          );
        }
      }
    }
  }
}
