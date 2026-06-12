import { Hono } from 'hono';
import { getCachedStandings } from '../../db/standings.ts';

/**
 * GET /standings — current group-stage standings, one entry per team, ordered
 * by group then rank. Refreshed by the fetch-standings job after matches
 * finish. Teams with no played matches yet simply won't appear here.
 */
export const standingsRoutes = new Hono().get('/', async (c) => {
  const standings = (await getCachedStandings()) ?? [];
  return c.json({ standings });
});
