/**
 * One-shot seed-data generator for the 2026 FIFA World Cup.
 *
 * Fetches teams + group assignments + group-stage fixtures from
 * api-football.com, downloads each team's logo, and writes an SQL file with
 * INSERTs for `teams` (48 rows) and `match_schedules` (104 rows).
 *
 * The /fixtures endpoint returns only the 72 group-stage slots — the 32
 * knockout slots come from openfootball/worldcup.json at runtime, with
 * stadium names and cities resolved through scripts/world-cup-2026-overrides.ts.
 * All 104 slots are sorted chronologically and assigned match_number = 1..104.
 *
 * Run:
 *   node --experimental-strip-types scripts/generate-world-cup-data.ts
 *
 * Requires env: FOOTBALL_DATA_API_KEY (and optionally FOOTBALL_DATA_API_BASE_URL).
 */

import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import pLimit from 'p-limit';
import {
  CITY_BY_VENUE_NAME,
  COUNTRY_CODE_BY_API_TEAM_ID,
  GROUND_TO_VENUE_NAME,
  ROUND_NAME_BY_OPENFOOTBALL,
  VENUE_NAME_BY_API_FIXTURE_ID,
} from './world-cup-2026-overrides.ts';

loadDotenv();

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const API_BASE_URL = process.env.FOOTBALL_DATA_API_BASE_URL ?? 'https://v3.football.api-sports.io';
if (!API_KEY) {
  console.error('FOOTBALL_DATA_API_KEY is not set');
  process.exit(1);
}

const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const LOGO_DIR = join(PROJECT_ROOT, 'src/assets/team-logos');
const SQL_OUTPUT = join(PROJECT_ROOT, 'scripts/world-cup-2026-seed.sql');

const EXPECTED_TEAMS = 48;
const EXPECTED_MATCHES = 104;

// ============================================================
// API types (only the fields we read)
// ============================================================

interface ApiTeamEntry {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    logo: string;
  };
}

interface ApiStandingsEntry {
  league: {
    standings: Array<
      Array<{
        rank: number;
        team: { id: number; name: string };
        group: string;
      }>
    >;
  };
}

interface ApiFixtureEntry {
  fixture: {
    id: number;
    date: string;
    venue: { id: number | null; name: string | null; city: string | null };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
}

// openfootball/worldcup.json shape (knockout matches lack a `group`).
interface OpenfootballMatch {
  round: string;
  date: string;
  time: string; // "HH:MM UTC±H" — local kickoff with a whole-hour offset
  group?: string;
  ground: string;
}
interface OpenfootballDoc {
  matches: OpenfootballMatch[];
}

// ============================================================
// API
// ============================================================

async function apiGet<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const url = new URL(path, API_BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY! } });
  if (!res.ok) {
    throw new Error(`GET ${url.pathname} -> HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response: T[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors =
    Array.isArray(errs) ? errs.length > 0 : !!errs && Object.keys(errs as object).length > 0;
  if (hasErrors) {
    throw new Error(`GET ${url.pathname} -> API errors: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

// ============================================================
// SQL helpers
// ============================================================

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlTimestamp(iso: string): string {
  return `${sqlString(iso)}::timestamptz`;
}

// ============================================================
// Main
// ============================================================

interface ScheduleSlot {
  match_time: string;
  round: string;
  venue_name: string;
  venue_city: string;
}

async function fetchOpenfootballKnockoutSlots(): Promise<ScheduleSlot[]> {
  const res = await fetch(OPENFOOTBALL_URL);
  if (!res.ok) {
    throw new Error(`openfootball -> HTTP ${res.status}`);
  }
  const doc = (await res.json()) as OpenfootballDoc;
  const knockouts = doc.matches.filter((m) => !m.group);
  return knockouts.map((m) => {
    const round = ROUND_NAME_BY_OPENFOOTBALL[m.round];
    if (!round) throw new Error(`openfootball: unmapped round "${m.round}"`);
    const venueName = GROUND_TO_VENUE_NAME[m.ground];
    if (!venueName) throw new Error(`openfootball: unmapped ground "${m.ground}"`);
    const venueCity = CITY_BY_VENUE_NAME[venueName] ?? venueName;
    return {
      match_time: parseOpenfootballTime(m.date, m.time),
      round,
      venue_name: venueName,
      venue_city: venueCity,
    };
  });
}

// openfootball times look like "16:30 UTC-4" — local clock + whole-hour offset.
// Convert to ISO 8601 so Postgres' timestamptz parser does the rest.
function parseOpenfootballTime(date: string, time: string): string {
  const match = /^(\d{2}:\d{2}) UTC([+-]\d+)$/.exec(time);
  if (!match) throw new Error(`unparseable openfootball time "${time}"`);
  const [, hhmm, offset] = match;
  const sign = offset![0];
  const hours = Math.abs(Number(offset!.slice(1)));
  return `${date}T${hhmm!}:00${sign}${String(hours).padStart(2, '0')}:00`;
}

async function downloadLogo(teamId: number, logoUrl: string): Promise<string> {
  const ext = extname(new URL(logoUrl).pathname) || '.png';
  const filename = `${teamId}${ext}`;
  const res = await fetch(logoUrl);
  if (!res.ok) {
    throw new Error(`logo ${logoUrl} -> HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(LOGO_DIR, filename), buf);
  return filename;
}

async function main(): Promise<void> {
  console.log('[1/5] Fetching teams...');
  const apiTeams = await apiGet<ApiTeamEntry>('/teams', { league: LEAGUE_ID, season: SEASON });
  console.log(`        -> ${apiTeams.length} teams`);
  if (apiTeams.length !== EXPECTED_TEAMS) {
    console.warn(`        WARN: expected ${EXPECTED_TEAMS}, got ${apiTeams.length}`);
  }

  console.log('[2/5] Fetching standings (for group assignments)...');
  const standings = await apiGet<ApiStandingsEntry>('/standings', {
    league: LEAGUE_ID,
    season: SEASON,
  });
  const groupByTeamId = new Map<number, string>();
  for (const block of standings) {
    for (const group of block.league.standings) {
      for (const row of group) {
        groupByTeamId.set(row.team.id, row.group);
      }
    }
  }
  console.log(`        -> ${groupByTeamId.size} teams have group assignments`);

  console.log('[3/5] Fetching fixtures + openfootball knockout schedule...');
  const [apiFixtures, knockoutSlots] = await Promise.all([
    apiGet<ApiFixtureEntry>('/fixtures', { league: LEAGUE_ID, season: SEASON }),
    fetchOpenfootballKnockoutSlots(),
  ]);
  console.log(`        -> ${apiFixtures.length} group fixtures, ${knockoutSlots.length} knockout slots`);

  console.log(`[4/5] Downloading ${apiTeams.length} logos to ${LOGO_DIR}...`);
  await mkdir(LOGO_DIR, { recursive: true });
  const limit = pLimit(8);
  const logoEntries = await Promise.all(
    apiTeams.map(({ team }) =>
      limit(async () => [team.id, await downloadLogo(team.id, team.logo)] as const)
    )
  );
  const logoFilenameByTeamId = new Map<number, string>(logoEntries);
  console.log(`        -> ${logoFilenameByTeamId.size} logos saved`);

  console.log('[5/5] Building SQL...');

  // ----- Build teams INSERTs -----
  const teamRows: string[] = [];
  for (const { team } of apiTeams) {
    const group = groupByTeamId.get(team.id);
    if (!group) {
      console.warn(`        WARN: team ${team.id} (${team.name}) has no group; writing "TBD"`);
    }
    const countryCode =
      COUNTRY_CODE_BY_API_TEAM_ID[team.id] ??
      team.code ??
      team.country.slice(0, 3).toUpperCase();
    const logo = logoFilenameByTeamId.get(team.id)!;
    teamRows.push(
      `  (${team.id}, ${sqlString(team.name)}, ${sqlString(countryCode)}, ${sqlString(logo)}, ${sqlString(group ?? 'TBD')})`
    );
  }
  // Surface any override entries that don't match a team we just fetched —
  // helps catch stale entries after the API renumbers a team.
  for (const overrideId of Object.keys(COUNTRY_CODE_BY_API_TEAM_ID).map(Number)) {
    if (!apiTeams.some(({ team }) => team.id === overrideId)) {
      console.warn(`        WARN: COUNTRY_CODE override for team ${overrideId} did not match any /teams entry`);
    }
  }

  // ----- Build match_schedules INSERTs (API fixtures + knockout supplement) -----
  const slots: ScheduleSlot[] = [];
  const tbdReports: string[] = [];
  for (const fx of apiFixtures) {
    const apiVenueName = fx.fixture.venue.name;
    const venueOverride = VENUE_NAME_BY_API_FIXTURE_ID[fx.fixture.id];
    const venueName = venueOverride ?? apiVenueName ?? 'TBD';

    // CITY_BY_VENUE_NAME wins over fixture.venue.city. This both backfills
    // null cities and rewrites Estadio Akron's city to "Guadalajara".
    const venueCity = CITY_BY_VENUE_NAME[venueName] ?? fx.fixture.venue.city ?? 'TBD';

    if (venueName === 'TBD') {
      tbdReports.push(
        `  fixture ${fx.fixture.id} @ ${fx.fixture.date} — ${fx.teams.home.name} vs ${fx.teams.away.name}`
      );
    }

    slots.push({
      match_time: fx.fixture.date,
      round: fx.league.round,
      venue_name: venueName,
      venue_city: venueCity,
    });
  }
  slots.push(...knockoutSlots);
  slots.sort((a, b) => a.match_time.localeCompare(b.match_time));

  if (tbdReports.length > 0) {
    console.warn(
      `\n  ${tbdReports.length} fixtures still have venue_name='TBD' — add entries to VENUE_NAME_BY_API_FIXTURE_ID and re-run:`
    );
    for (const line of tbdReports) console.warn(line);
  }

  if (slots.length !== EXPECTED_MATCHES) {
    console.warn(`        WARN: expected ${EXPECTED_MATCHES} match slots, got ${slots.length}`);
  }

  const scheduleRows = slots.map((s, i) => {
    const matchNumber = i + 1;
    const roundType: 'group' | 'knockout' = s.round.startsWith('Group') ? 'group' : 'knockout';
    return `  (${matchNumber}, ${sqlTimestamp(s.match_time)}, ${sqlString(roundType)}, ${sqlString(s.round)}, ${sqlString(s.venue_name)}, ${sqlString(s.venue_city)})`;
  });

  // ----- Write SQL -----
  const sql = `-- ============================================================
-- 2026 FIFA World Cup -- teams + match_schedules seed
-- Generated by scripts/generate-world-cup-data.ts
-- DO NOT EDIT BY HAND -- regenerate via the script.
-- ============================================================

BEGIN;

-- ---------- teams (${teamRows.length} rows) ----------
INSERT INTO teams (api_team_id, team_name, country_code, logo, group_name) VALUES
${teamRows.join(',\n')};

-- ---------- match_schedules (${scheduleRows.length} rows) ----------
INSERT INTO match_schedules (match_number, match_time, round_type, round, venue_name, venue_city) VALUES
${scheduleRows.join(',\n')};

COMMIT;
`;

  await mkdir(resolve(SQL_OUTPUT, '..'), { recursive: true });
  await writeFile(SQL_OUTPUT, sql);
  console.log(`\nWrote ${SQL_OUTPUT}`);
  console.log(`Logos in   ${LOGO_DIR}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
