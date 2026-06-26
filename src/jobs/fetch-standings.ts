import config from '../config.ts';
import {
  getTeamIdByApiId,
  hasRecentlyFinishedMatch,
  upsertTeamStandingIfChanged,
} from '../db/standings.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob. Runs every 5
// minutes, but returns immediately (no API call) unless a match finished within
// the last hour, so off-match-day cycles are nearly free.
export const FETCH_STANDINGS_INTERVAL_MS = 5 * 60 * 1000;

// Only refresh when something actually changed the table — i.e. a match
// finished recently. Slightly wider than the run interval so we never miss a
// result that landed between cycles.
const RECENTLY_FINISHED_INTERVAL = '1 hour';

const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;

interface ApiStandingEntry {
  rank: number;
  team: { id: number };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

interface ApiStandingsResponse {
  // standings is an array of groups, each group an array of team entries.
  league: { standings: ApiStandingEntry[][] };
}

async function fetchApiStandings(): Promise<ApiStandingEntry[][]> {
  const url = new URL('/standings', config.FOOTBALL_DATA_API_BASE_URL);
  url.searchParams.set('league', String(LEAGUE_ID));
  url.searchParams.set('season', String(SEASON));
  const res = await fetch(url, {
    headers: { 'x-apisports-key': config.FOOTBALL_DATA_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`GET ${url.pathname} -> HTTP ${String(res.status)}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response: ApiStandingsResponse[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : typeof errs === 'object' && errs !== null && Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`GET ${url.pathname} -> API errors: ${JSON.stringify(errs)}`);
  }
  return json.response[0]?.league.standings ?? [];
}

/**
 * Refreshes group-stage standings from api-football. Skips the API call unless a
 * match finished in the last hour (standings only change then). For each team in
 * the API response it upserts the `team_standings` row when the data changed.
 */
export async function runFetchStandingsJob(): Promise<void> {
  if (!(await hasRecentlyFinishedMatch(RECENTLY_FINISHED_INTERVAL))) {
    return; // nothing finished recently → standings unchanged, skip
  }

  const teamIdByApiId = await getTeamIdByApiId();
  const groups = await fetchApiStandings();

  let updated = 0;
  for (const group of groups) {
    for (const entry of group) {
      if (entry.group.replace('Group ', '').length !== 1) {
        console.log('invalid group name', entry);
        continue;
      }
      const teamId = teamIdByApiId.get(entry.team.id);
      if (!teamId) {
        console.warn(`fetch-standings: unknown api team id ${String(entry.team.id)}`);
        continue;
      }
      const changed = await upsertTeamStandingIfChanged({
        team_id: teamId,
        rank: entry.rank,
        played: entry.all.played,
        win: entry.all.win,
        draw: entry.all.draw,
        lose: entry.all.lose,
        goals_for: entry.all.goals.for,
        goals_against: entry.all.goals.against,
        goals_diff: entry.goalsDiff,
        points: entry.points,
      });
      if (changed) updated++;
    }
  }

  if (updated > 0) {
    console.log(`fetch-standings: ${String(updated)} standings rows updated`);
  }
}
