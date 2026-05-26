import { Hono } from 'hono';
import { getCachedTeams } from '../../db/teams.ts';

/**
 * GET /teams — public list of teams competing in the tournament. The `logo`
 * field is a URL the client renders as the team's flag image.
 */
export const teamsRoutes = new Hono().get('/', async (c) => {
  const teams = (await getCachedTeams()) ?? [];
  return c.json({ teams });
});
