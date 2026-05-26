import { Hono } from 'hono';
import { getCachedFixtures } from '../../db/fixtures.ts';

/**
 * GET /fixtures — combined view over match_schedules + fixtures +
 * fixture_results + fixture_live_results. Returns every scheduled match
 * (teams may be null until the fixture row is created) with a derived
 * status of 'scheduled' | 'live' | 'finished'.
 */
export const fixturesRoutes = new Hono().get('/', async (c) => {
  const fixtures = (await getCachedFixtures()) ?? [];
  return c.json({ fixtures });
});
