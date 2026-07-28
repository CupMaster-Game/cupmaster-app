// Verifies that a transaction carries the CupMaster Celo attribution tag.
//
// Usage (run from the src/frontend directory):
//   pnpm verify:attribution-tag <txHash>
//   # or: node --env-file-if-exists=.env --experimental-strip-types \
//   #        scripts/verify-attribution-tag.ts <txHash>
//
// The expected code is read from VITE_CELO_ATTRIBUTION_CODE (loaded from
// src/frontend/.env by the pnpm script). It decodes the tx's calldata suffix
// on-chain and checks that our code (e.g. celo_sqv2cpm2) is present. This is the
// "confirm it worked" step from Celo: run it against your first tagged tx.

import { verifyTx } from '@celo/attribution-tags';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

const RPC_URL = 'https://forno.celo.org';
const EXPECTED_CODE = process.env.VITE_CELO_ATTRIBUTION_CODE;

async function main(): Promise<void> {
  const hash = process.argv[2] as `0x${string}` | undefined;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    console.error('Usage: pnpm verify:attribution-tag <txHash>');
    process.exit(1);
  }

  const client = createPublicClient({ chain: celo, transport: http(RPC_URL) });

  const result = await verifyTx({ client, hash });
  if (!result) {
    console.error(`❌ No attribution tag found on ${hash}`);
    process.exit(1);
  }

  console.log('Decoded attribution:', result);

  if (!EXPECTED_CODE) {
    console.warn(
      '⚠️  VITE_CELO_ATTRIBUTION_CODE not set — printed the decoded codes but could not assert ours is present.'
    );
    return;
  }

  if (result.codes.includes(EXPECTED_CODE)) {
    console.log(`✅ CupMaster tag "${EXPECTED_CODE}" is on-chain for ${hash}`);
  } else {
    console.error(`❌ Tag present but "${EXPECTED_CODE}" not among:`, result.codes);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
