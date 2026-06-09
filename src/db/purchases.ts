import { GAME_TYPE_IDS } from '../constants.ts';
import { sql, withTransaction } from './index.ts';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Checks if a transaction hash already exists in user_transactions.
 */
export async function findTransactionByHash(txHash: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_transactions WHERE tx_hash = ${txHash}
  `;
  return rows.length > 0;
}

/**
 * Returns the subset of the given tx hashes that already exist in
 * user_transactions, as a Set. Done in a single query.
 */
export async function findExistingTxHashes(txHashes: string[]): Promise<Set<string>> {
  if (txHashes.length === 0) return new Set();
  const rows = await sql<{ tx_hash: string }[]>`
    SELECT tx_hash FROM user_transactions WHERE tx_hash IN ${sql(txHashes)}
  `;
  return new Set(rows.map((r) => r.tx_hash));
}

/**
 * Processes a purchase transaction. Transactionally:
 * 1. Inserts into user_transactions
 * 2. If energy package (itemTypeId is a game type): inserts energy_issuance, increments user energy for the relevant game type
 */
export async function processPurchase(
  userId: string,
  txHash: string,
  txTime: Date,
  revenue: string,
  itemTypeId: number,
  eventParams: object
): Promise<{ transaction_id: string }> {
  return withTransaction(async (tx) => {
    // 1. Save transaction
    const txRows = await tx<{ transaction_id: string }[]>`
      INSERT INTO user_transactions (user_id, tx_hash, tx_time, revenue, event_params)
      VALUES (${userId}, ${txHash}, ${txTime}, ${revenue}, ${JSON.stringify(eventParams)})
      RETURNING transaction_id
    `;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const transactionId = txRows[0]!.transaction_id;

    if ((GAME_TYPE_IDS as readonly number[]).includes(itemTypeId)) {
      // 2a. Energy package — issue energy
      await tx`
        INSERT INTO energy_issuance (user_id, issuance_type, game_type, amount, transaction_id)
        VALUES (${userId}, 'buy_energy', ${itemTypeId}, 1, ${transactionId})
      `;
      await tx`
        UPDATE user_numbers
        SET    energy = energy + 1
        WHERE  user_id = ${userId} AND game_type = ${itemTypeId}
      `;
    }

    return { transaction_id: transactionId };
  });
}
