import type { Chain, GetTransactionReceiptReturnType } from 'viem';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import cupmasterGameAbi from '../abis/cupmaster-game.abi.ts';
import { CUPMASTER_GAME_ADDRESS, rpcUrls } from '../constants.ts';

const clients = rpcUrls.map((url: string) =>
  createPublicClient({ chain: celo, transport: http(url) })
);

export async function getTransactionReceipt(
  hash: `0x${string}`
): Promise<GetTransactionReceiptReturnType<Chain>> {
  for (const client of clients) {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getTransactionReceipt');
}

export async function getBlock(blockNumber: bigint) {
  for (const client of clients) {
    try {
      return await client.getBlock({ blockNumber });
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getBlock');
}

let cachedSeed: `0x${string}` | null = null;

// SEED is an immutable bytes32 set at contract deploy time, so it's safe to
// fetch once and cache for the process lifetime.
export async function getCupmasterSeed(): Promise<`0x${string}`> {
  if (cachedSeed) return cachedSeed;
  for (const client of clients) {
    try {
      const seed = await client.readContract({
        address: CUPMASTER_GAME_ADDRESS as `0x${string}`,
        abi: cupmasterGameAbi,
        functionName: 'SEED',
      });
      cachedSeed = seed;
      return seed;
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for SEED');
}
