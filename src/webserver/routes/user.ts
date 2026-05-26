import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { getCachedLeaderboards } from '../../db/leaderboard.ts';
import { getPendingPayouts } from '../../db/payouts.ts';
import {
  findUserIdByAddress,
  getUserInventory,
  getUserWithNumbers,
  renameUser,
} from '../../db/users.ts';
import { makeSmartCached } from '../../utils/smart-cache.ts';
import { authMiddleware, type AuthEnv } from '../middleware/auth.ts';
import { nameSchema } from './auth.ts';

const getCachedUserResponse = makeSmartCached(
  async (userId: string) => {
    const [user, inventory, pendingClaims, leaderboards] = await Promise.all([
      getUserWithNumbers(userId),
      getUserInventory(userId),
      getPendingPayouts(userId),
      getCachedLeaderboards(),
    ]);
    if (!user) return null;

    const overall = leaderboards?.overall ?? [];
    const globalRank = overall.find((e) => e.user_id === userId)?.rank ?? null;

    return {
      user_id: user.user_id,
      address: user.address,
      name: user.name,
      flag: user.flag,
      user_source: user.user_source,
      is_banned: user.is_banned,
      created_at: user.created_at,
      stats: {
        games_played: user.games_played,
        predictions_made: user.predictions_made,
        total_score: user.total_score,
        global_rank: globalRank,
      },
      inventory,
      pending_claims: pendingClaims,
    };
  },
  { cacheSeconds: 3, cacheSize: 15_000 }
);

/**
 * GET  /user         — authenticated user's profile + stats
 * POST /user/rename  — change the authenticated user's display name
 */
export const userRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)
  .get('/', async (c) => {
    const { user_id } = c.var.user;

    const response = await getCachedUserResponse(user_id);
    if (!response) {
      return c.json({ error: 'User not found. Please sign up first.' }, 404);
    }

    return c.json(response);
  })
  .post(
    '/rename',
    validator('json', (value, c) => {
      const result = z
        .object({
          name: nameSchema,
          flag: z.string().max(50, 'Flag url must be at most 50 characters'),
        })
        .safeParse(value);
      if (!result.success) {
        return c.json({ error: 'Invalid request body', details: result.error.issues }, 400);
      }
      return result.data;
    }),
    async (c) => {
      const { address } = c.var.user;
      const { name, flag } = c.req.valid('json');

      const result = await renameUser(address, name, flag);
      if (!result.success) {
        if (result.reason === 'user_not_found') {
          return c.json({ error: 'User not found. Please sign up first.' }, 404);
        }
        if (result.reason === 'name_taken') {
          return c.json({ error: 'This name is already taken.' }, 409);
        }
        // no_change — name matches the current one; nothing to do.
        return c.json({ name });
      }

      return c.json({ name });
    }
  );

/**
 * GET /checkuser?account — check if a wallet address is already registered.
 * Public endpoint — no auth required.
 */
export const checkUserRoute = new Hono().get(
  '/',
  validator('query', (value, c) => {
    const result = z
      .object({
        account: z
          .string()
          .regex(/^0x[0-9a-fA-F]{40}$/, 'account must be a valid Ethereum address'),
      })
      .safeParse(value);
    if (!result.success) {
      return c.json({ error: 'Invalid account address', details: result.error.issues }, 400);
    }
    return result.data;
  }),
  async (c) => {
    const { account } = c.req.valid('query');
    const user_id = await findUserIdByAddress(account);

    if (!user_id) {
      return c.json({ registered: false });
    }

    return c.json({ registered: true });
  }
);
