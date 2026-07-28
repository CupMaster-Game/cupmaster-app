import { getAuthedApi } from '@/lib/api';
import { ATTRIBUTION_SUFFIX } from '@/lib/attribution';
import cupmasterGameAbi from '@backend/abis/cupmaster-game.abi';
import { CUPMASTER_GAME_ADDRESS, PAYMENT_TOKENS } from '@backend/constants';
import type { PendingClaim } from '@/types';
import { useCallback, useState } from 'react';
import {
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  UserRejectedRequestError,
  type PublicClient,
  type TransactionReceipt,
} from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';

// Claims an unclaimed on-chain reward: calls claim(actionId, paymentToken,
// amount, signature) on the CupMasterGame contract, waits for confirmation,
// then submits the tx hash to the backend which records the claim.

export type ClaimStatus =
  | null
  | 'awaiting_wallet'
  | 'confirming'
  | 'submitting'
  | 'rejected'
  | 'error'
  | 'success';

const GAME_ADDRESS = CUPMASTER_GAME_ADDRESS as `0x${string}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForReceiptResilient(
  client: PublicClient,
  hash: `0x${string}`,
  { timeoutMs = 60_000, pollMs = 1_500 }: { timeoutMs?: number; pollMs?: number } = {}
): Promise<TransactionReceipt> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch (err) {
      const transient =
        err instanceof TransactionReceiptNotFoundError || err instanceof TransactionNotFoundError;
      if (!transient || Date.now() >= deadline) throw err;
      await sleep(pollMs);
    }
  }
}

export function useClaim() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const resetClaimStatus = useCallback(() => {
    setClaimStatus(null);
  }, []);

  const claim = useCallback(
    async (pendingClaim: PendingClaim): Promise<boolean> => {
      if (!publicClient || !address) {
        setClaimStatus('error');
        return false;
      }
      const tokenInfo = (
        PAYMENT_TOKENS as Record<number, (typeof PAYMENT_TOKENS)[1] | undefined>
      )[pendingClaim.payment_token];
      if (!tokenInfo) {
        setClaimStatus('error');
        return false;
      }

      setClaimingId(pendingClaim.payout_id);
      setClaimStatus('awaiting_wallet');

      try {
        const txHash = await writeContractAsync({
          address: GAME_ADDRESS,
          abi: cupmasterGameAbi,
          functionName: 'claim',
          args: [
            BigInt(pendingClaim.action_id),
            tokenInfo.address as `0x${string}`,
            BigInt(pendingClaim.amount),
            pendingClaim.signature as `0x${string}`,
          ],
          dataSuffix: ATTRIBUTION_SUFFIX,
        });

        setClaimStatus('confirming');
        const receipt = await waitForReceiptResilient(publicClient, txHash);
        if (receipt.status === 'reverted') {
          throw new Error('Claim transaction reverted');
        }

        // Submit the tx hash so the backend records the claim.
        setClaimStatus('submitting');
        const authed = getAuthedApi(address);
        if (!authed) {
          setClaimStatus('error');
          return false;
        }
        const submitRes = await authed.user_claims.submit.$post({
          json: { tx_hash: txHash },
        });
        if (!submitRes.ok) {
          setClaimStatus('error');
          return false;
        }

        setClaimStatus('success');
        return true;
      } catch (err) {
        const e = err as { code?: number; message?: string; cause?: unknown };
        const lowered = e.message?.toLowerCase() ?? '';
        const isRejection =
          err instanceof UserRejectedRequestError ||
          e.cause instanceof UserRejectedRequestError ||
          e.code === 4001 ||
          lowered.includes('rejected') ||
          lowered.includes('denied by user');

        if (isRejection) {
          setClaimStatus('rejected');
        } else {
          console.error('Claim error', err);
          setClaimStatus('error');
        }
        return false;
      } finally {
        setClaimingId(null);
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return { claim, claimStatus, claimingId, resetClaimStatus };
}
