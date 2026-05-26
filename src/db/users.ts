import { SIGNUP_ENERGIES } from '../constants.ts';
import { dateFromId } from '../utils/index.ts';
import { makeSmartCached } from '../utils/smart-cache.ts';
import { sql, withTransaction } from './index.ts';

// ---------------------------------------------------------------------------
// Row types — mirror the schema exactly.
// postgres.js returns BIGINT columns as strings to preserve precision.
// ---------------------------------------------------------------------------

export type UserSource = 'mobile-web' | 'web' | 'minipay';

export interface UserRow {
  user_id: string;
  address: string; // lowercase 0x-prefixed, 40 hex chars
  user_source: UserSource;
  wallet_info: string;
  name: string;
  flag: string;
  is_banned: boolean;
  created_at: Date;
}

export type UserWithNumbersRow = UserRow & {
  games_played: number;
  predictions_made: number;
  total_score: number;
};

// ---------------------------------------------------------------------------
// Queries — read paths use the `users_with_data` view, which already joins
// the latest user_mutable_data row and exposes a derived `created_at`.
// ---------------------------------------------------------------------------

export async function findUserByAddress(address: string): Promise<UserRow | null> {
  const rows = await sql<UserRow[]>`
    SELECT user_id, address, user_source, wallet_info, name, flag, is_banned, created_at
    FROM   users_with_data
    WHERE  address = ${address.toLowerCase()}
  `;
  return rows[0] ?? null;
}

// 3s cached variant for read-only hot paths. Do not use in auth/write flows
// where stale reads (e.g. duplicate-signup guard, read-after-insert) would be
// incorrect — call findUserByAddress directly there.
export const findUserByAddressCached = makeSmartCached(findUserByAddress, {
  cacheSeconds: 3,
  cacheSize: 10_000,
});

export async function findUserIdByAddress(address: string): Promise<string | null> {
  const rows = await sql<{ user_id: string }[]>`
    SELECT user_id FROM   users
    WHERE  address = ${address.toLowerCase()}
  `;
  return rows[0]?.user_id ?? null;
}

// 3s cached variant for read-only hot paths. Do not use in auth/write flows
// where stale reads (e.g. duplicate-signup guard, read-after-insert) would be
// incorrect — call findUserByAddress directly there.
export const findUserIdByAddressCached = makeSmartCached(findUserIdByAddress, {
  cacheSeconds: 86400,
  cacheSize: 20_000,
});

async function fetchBannedUserIds(): Promise<Set<string>> {
  const rows = await sql<{ user_id: string }[]>`
    SELECT user_id FROM users_with_data WHERE is_banned
  `;
  return new Set(rows.map((r) => r.user_id));
}

// 10-min auto-refreshing blacklist used by the auth middleware and any other
// hot path that needs an O(1) "is this user banned?" check. Up to 10 minutes
// stale, which is acceptable since /user/ban (or equivalent admin path) is
// rare and a few extra minutes of access for a freshly-banned user is fine.
export const getCachedBannedUserIds = makeSmartCached(fetchBannedUserIds, {
  cacheSeconds: 600,
  autoRefresh: true,
});

export async function findUserByName(name: string): Promise<UserRow | null> {
  const rows = await sql<UserRow[]>`
    SELECT user_id, address, user_source, wallet_info, name, is_banned, created_at
    FROM   users_with_data
    WHERE  name = ${name}
  `;
  return rows[0] ?? null;
}

export async function getUserWithNumbers(userId: string): Promise<UserWithNumbersRow | null> {
  const rows = await sql<UserWithNumbersRow[]>`
    SELECT
      u.user_id,
      u.address,
      u.user_source,
      u.wallet_info,
      u.name,
      u.flag,
      u.is_banned,
      u.created_at,
      COALESCE(SUM(CASE WHEN un.game_type IN (101, 102, 103) THEN un.games_played END), 0)::int AS games_played,
      COALESCE(SUM(CASE WHEN un.game_type IN (201, 202, 203) THEN un.games_played END), 0)::int AS predictions_made,
      COALESCE(SUM(un.total_score), 0)::int AS total_score
    FROM   users_with_data u
    LEFT JOIN user_numbers un ON un.user_id = u.user_id
    WHERE  u.user_id = ${userId}
    GROUP BY u.user_id, u.address, u.user_source, u.wallet_info, u.name, u.flag, u.is_banned, u.created_at
  `;
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface UserItemRow {
  item_id: string;
  item_type: number;
  acquisition_type: string;
  acquisition_date: Date;
}

export async function getUserInventory(userId: string): Promise<UserItemRow[]> {
  const rows = await sql<Omit<UserItemRow, 'acquisition_date'>[]>`
    SELECT i.item_id, i.item_type, i.acquisition_type
    FROM   user_items i
    WHERE  i.user_id = ${userId}
      AND  NOT EXISTS (
        SELECT 1 FROM user_item_usages u WHERE u.item_id = i.item_id
      )
    ORDER BY i.item_id DESC
  `;
  return rows.map((r) => ({ ...r, acquisition_date: dateFromId(r.item_id) }));
}

export type CreateUserResult =
  | { success: true; user: UserRow }
  | { success: false; reason: 'name_taken' };

/**
 * Creates a user + initial user_mutable_data + user_numbers (with initial energy)
 * + energy_issuance record in a single transaction. Name uniqueness is checked
 * via `users_with_data` (latest mutable row per user), serialized via a
 * transaction-scoped advisory lock keyed on the name. The unique constraint
 * on users.address still throws postgres error '23505' on duplicate address.
 */
export async function createUser(
  address: string,
  name: string,
  flag: string,
  userSource: UserSource,
  walletInfo: string
): Promise<CreateUserResult> {
  const lowerAddress = address.toLowerCase();

  const taken = await withTransaction<boolean>(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${name}))`;

    const conflict = await tx`
      SELECT 1
      FROM   users_with_data
      WHERE  name = ${name}
      LIMIT 1
    `;
    if (conflict.length > 0) {
      return true;
    }

    const userRows = await tx<{ user_id: string }[]>`
      INSERT INTO users (address, user_source, wallet_info)
      VALUES (${lowerAddress}, ${userSource}, ${walletInfo})
      RETURNING user_id
    `;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = userRows[0]!.user_id;

    await tx`
      INSERT INTO user_mutable_data (user_id, name, flag)
      VALUES (${userId}, ${name}, ${flag})
    `;
    for (const gameType of [101, 102, 103, 201, 202, 203] as const) {
      await tx`
        INSERT INTO energy_issuance (user_id, issuance_type, game_type, amount)
        VALUES (${userId}, 'signup', ${gameType}, ${SIGNUP_ENERGIES[gameType]})
      `;
      await tx`
        INSERT INTO user_numbers (user_id, game_type, energy)
        VALUES (${userId}, ${gameType}, ${SIGNUP_ENERGIES[gameType]})
      `;
    }
    return false;
  });

  if (taken) {
    return { success: false, reason: 'name_taken' };
  }

  // Safe to assert non-null: we just inserted it.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { success: true, user: (await findUserByAddress(lowerAddress))! };
}

export type RenameResult =
  | { success: true }
  | { success: false; reason: 'name_taken' | 'user_not_found' | 'no_change' };

/**
 * Inserts a new user_mutable_data row with the given name, preserving the
 * latest is_banned flag. Uniqueness is checked via `users_with_data` inside
 * the same transaction; a transaction-scoped advisory lock keyed on the name
 * serializes concurrent renames to the same target.
 */
export async function renameUser(
  address: string,
  newName: string,
  flag: string
): Promise<RenameResult> {
  const lowerAddress = address.toLowerCase();

  return withTransaction<RenameResult>(async (tx) => {
    // Serialize concurrent renames targeting the same name.
    await tx`SELECT pg_advisory_xact_lock(hashtext(${newName}))`;

    const currentRows = await tx<{ user_id: string; name: string; is_banned: boolean }[]>`
      SELECT user_id, name, is_banned
      FROM   users_with_data
      WHERE  address = ${lowerAddress}
    `;
    if (!currentRows[0]) {
      return { success: false, reason: 'user_not_found' };
    }
    const { user_id: userId, name: currentName, is_banned: isBanned } = currentRows[0];

    if (currentName === newName) {
      return { success: false, reason: 'no_change' };
    }

    const conflict = await tx`
      SELECT 1
      FROM   users_with_data
      WHERE  name = ${newName}
        AND  user_id <> ${userId}
      LIMIT 1
    `;
    if (conflict.length > 0) {
      return { success: false, reason: 'name_taken' };
    }

    await tx`
      INSERT INTO user_mutable_data (user_id, name, flag, is_banned)
      VALUES (${userId}, ${newName}, ${flag} ${isBanned})
    `;

    return { success: true };
  });
}
