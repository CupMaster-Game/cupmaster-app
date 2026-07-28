/**
 * One-off: create a single pending (unclaimed) reward for a specific user.
 *
 * A "pending claimable reward" is a `user_payouts` row that has no matching
 * `user_claims` row yet — exactly what `getPendingPayouts()` returns and what
 * the frontend lets a user claim on-chain. This script inserts one such row,
 * signed with the same signer key + claim payload the tournament job uses, so
 * the resulting signature is actually valid against the on-chain contract.
 *
 * Edit the constants below (USER_ID, AMOUNT), then run:
 *   node --experimental-strip-types scripts/generate-pending-reward.ts
 *
 * Requires the same env the backend uses (config.ts): DATABASE_URL,
 * ENCRYPTED_PASS, ENCRYPTED_SIGNER_PRIVATE_KEY, PASS, plus the Celo RPC config
 * consumed by getCupmasterSeed().
 */

import crypto from 'node:crypto';
import { encodePacked, keccak256, parseUnits, toBytes, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PAYMENT_TOKENS, TOURNAMENT_PAYOUT_TOKEN_ID } from '../src/constants.ts';
import { sql } from '../src/db/index.ts';
import { getPrivateKey } from '../src/jobs/process-tournament.ts';
import { getCupmasterSeed } from '../src/utils/celo-rpc-reader.ts';

// ---------------------------------------------------------------------------
// Edit these two constants.
// ---------------------------------------------------------------------------

// User to receive the pending reward.
const USER_ID = '3732930211274365537';

// Reward amount in human-readable token units (e.g. 0.01 USDT).
const AMOUNT = '0.01';

// ---------------------------------------------------------------------------

// keccak256("claim") — selector mixed into every claim signature payload.
// Matches CLAIM_SELECTOR in process-tournament.ts.
const CLAIM_SELECTOR = keccak256(toBytes('claim'));

const payoutToken = PAYMENT_TOKENS[TOURNAMENT_PAYOUT_TOKEN_ID];

function randomActionId(): bigint {
  return BigInt('0x' + crypto.randomBytes(32).toString('hex'));
}

/**
 * Mirrors the on-chain hash (identical to signClaim in process-tournament.ts):
 * keccak256(abi.encodePacked(SEED, keccak256("claim"), actionId, msg.sender,
 * paymentToken, amount)) wrapped in the EIP-191 signed-message prefix.
 */
async function signClaim(
  signer: ReturnType<typeof privateKeyToAccount>,
  seed: `0x${string}`,
  actionId: bigint,
  recipient: string,
  amountWei: bigint
): Promise<string> {
  const innerHash = keccak256(
    encodePacked(
      ['bytes32', 'bytes32', 'uint256', 'address', 'address', 'uint256'],
      [
        seed,
        CLAIM_SELECTOR,
        actionId,
        recipient as `0x${string}`,
        payoutToken.address as `0x${string}`,
        amountWei,
      ]
    )
  );
  return signer.signMessage({ message: { raw: innerHash } });
}

async function main(): Promise<void> {
  const amountWei = parseUnits(AMOUNT, payoutToken.decimals);
  if (amountWei <= 0n) {
    throw new Error(`AMOUNT must be > 0 (got "${AMOUNT}")`);
  }

  try {
    const users = await sql<{ address: string }[]>`
      SELECT address FROM users WHERE user_id = ${USER_ID}
    `;
    const user = users[0];
    if (!user) {
      throw new Error(`No user found with user_id ${USER_ID}`);
    }

    const seed = await getCupmasterSeed();
    const signer = privateKeyToAccount(getPrivateKey());

    const actionIdBigInt = randomActionId();
    const actionId = toHex(actionIdBigInt);
    const signature = await signClaim(signer, seed, actionIdBigInt, user.address, amountWei);

    const rows = await sql<{ payout_id: string }[]>`
      INSERT INTO user_payouts
        (user_id, payout_type, action_id, amount, payment_token, signature)
      VALUES
        (${USER_ID}::bigint, 'tournament_reward', ${actionId},
         ${amountWei.toString()}::numeric, ${TOURNAMENT_PAYOUT_TOKEN_ID}::smallint, ${signature})
      RETURNING payout_id
    `;

    console.log(
      `generate-pending-reward: created payout ${rows[0]?.payout_id ?? '?'} ` +
        `for user ${USER_ID} — ${AMOUNT} ${payoutToken.symbol} (${amountWei.toString()} wei), ` +
        `action_id ${actionId}`
    );
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('generate-pending-reward: failed', err);
  process.exit(1);
});
