import { makeSmartCached } from '../utils/smart-cache.ts';
import { sql } from './index.ts';

// Mirrors the `teams` table columns, with BIGINT ids returned as strings by
// postgres.js to preserve precision.
export interface TeamRow {
  team_id: string;
  api_team_id: number;
  team_name: string;
  country_code: string; // 3-letter, e.g. "BRA"
  logo: string; // URL — used as flag image on the client
  group_name: string; // "Group A" .. "Group L"
}

async function fetchAllTeams(): Promise<TeamRow[]> {
  return sql<TeamRow[]>`
    SELECT team_id, api_team_id, team_name, country_code, logo, group_name
    FROM   teams
    ORDER BY group_name, team_name
  `;
}

// Teams are static reference data — cache aggressively and auto-refresh so the
// first /teams hit per process pays the round trip and everyone else gets it
// from memory.
export const getCachedTeams = makeSmartCached(fetchAllTeams, {
  cacheSeconds: 3600,
  autoRefresh: true,
});
