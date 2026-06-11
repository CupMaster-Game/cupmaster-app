import type { Context } from 'hono';
import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';
import {
  getUserPredictions,
  submitPrediction,
  submitPredictionChange,
  type PredictionPayload,
  type SubmitPredictionOutcome,
} from '../../db/predictions.ts';
import { authMiddleware, type AuthEnv } from '../middleware/auth.ts';

function getClientIp(c: Context): string | null {
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

const teamIdSchema = z.string().regex(/^\d+$/, 'team_id must be a numeric string');

const matchPredictionSchema = z.object({
  type: z.literal('match_prediction'),
  data: z.object({
    match_number: z.number().int().min(1).max(104),
    result: z.enum(['team1', 'team2', 'draw']),
  }),
});

const groupPredictionSchema = z.object({
  type: z.literal('group_prediction'),
  data: z.object({
    standings: z
      .array(
        z.object({
          group_name: z.string().min(1).max(32),
          ordered_teams: z.array(teamIdSchema).min(2).max(8),
        })
      )
      .min(1)
      .max(16),
  }),
});

const knockoutPredictionSchema = z.object({
  type: z.literal('knockout_bracket_prediction'),
  data: z.object({
    match_results: z
      .array(
        z.object({
          match_number: z.number().int().min(1).max(104),
          winner_team_id: teamIdSchema,
        })
      )
      .min(1)
      .max(64),
  }),
});

const predictionSchema = z.discriminatedUnion('type', [
  matchPredictionSchema,
  groupPredictionSchema,
  knockoutPredictionSchema,
]);

function mapSubmitError(outcome: SubmitPredictionOutcome, c: Context) {
  if (outcome.ok) return null;
  switch (outcome.error) {
    case 'duplicate_prediction':
      return c.json({ error: 'Prediction already submitted' }, 409);
    case 'not_enough_energy':
      return c.json({ error: 'Not enough energy' }, 400);
    case 'no_existing_prediction':
      return c.json({ error: 'No existing prediction to update' }, 404);
    case 'match_started':
      return c.json({ error: 'Match has already started' }, 409);
  }
}

export const predictionsRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // POST /predictions/submit — create a new prediction (decrements energy).
  .post(
    '/submit',
    validator('json', (value, c) => {
      const result = predictionSchema.safeParse(value);
      if (!result.success) {
        return c.json({ error: 'Invalid request body', details: result.error.issues }, 400);
      }
      return result.data;
    }),
    async (c) => {
      const { user_id } = c.var.user;
      const payload: PredictionPayload = c.req.valid('json');

      const outcome = await submitPrediction(user_id, payload, getClientIp(c));
      const err = mapSubmitError(outcome, c);
      if (err) return err;
      if (!outcome.ok) return c.json({ error: 'Unknown error' }, 500);

      return c.json({ game_play_id: outcome.game_play_id });
    }
  )

  // POST /predictions/submitChange — update an existing prediction.
  // No new game_play; no energy deducted.
  .post(
    '/submitChange',
    validator('json', (value, c) => {
      const result = predictionSchema.safeParse(value);
      if (!result.success) {
        return c.json({ error: 'Invalid request body', details: result.error.issues }, 400);
      }
      return result.data;
    }),
    async (c) => {
      const { user_id } = c.var.user;
      const payload: PredictionPayload = c.req.valid('json');

      const outcome = await submitPredictionChange(user_id, payload);
      const err = mapSubmitError(outcome, c);
      if (err) return err;
      if (!outcome.ok) return c.json({ error: 'Unknown error' }, 500);

      return c.json({ game_play_id: outcome.game_play_id });
    }
  )

  // GET /predictions — fetch all of the user's latest predictions.
  .get('/', async (c) => {
    const { user_id } = c.var.user;
    const predictions = await getUserPredictions(user_id);
    return c.json(predictions);
  });
