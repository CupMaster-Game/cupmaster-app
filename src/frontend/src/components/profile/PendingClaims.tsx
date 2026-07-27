import { Trophy } from 'lucide-react';
import { formatUnits } from 'viem';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useClaim } from '@/hooks/useClaim';
import { PAYMENT_TOKENS } from '@backend/constants';
import type { PendingClaim } from '@/types';
import { useEffect } from 'react';

const PAYOUT_TYPE_LABELS: Record<string, string> = {
  tournament_reward: 'Tournament Reward',
};

function payoutLabel(type: string): string {
  return PAYOUT_TYPE_LABELS[type] ?? 'Reward';
}

// Stablecoin payouts are USD-pegged, so the token amount is also the dollar
// value. Returns { amount, symbol, usd } formatted for display.
function formatClaim(claim: PendingClaim) {
  const token = (PAYMENT_TOKENS as Record<number, (typeof PAYMENT_TOKENS)[1] | undefined>)[
    claim.payment_token
  ];
  if (!token) return null;
  const value = Number(formatUnits(BigInt(claim.amount), token.decimals));
  return {
    symbol: token.symbol,
    amount: value.toLocaleString(undefined, { maximumFractionDigits: 4 }),
    usd: value.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
}

export function PendingClaims() {
  const { user, refreshUser } = useAuth();
  const { claim, claimStatus, claimingId, resetClaimStatus } = useClaim();

  // Refresh the profile once a claim is recorded so the reward drops off the
  // list; clear a rejected/errored status after surfacing it.
  useEffect(() => {
    if (claimStatus === 'success') {
      void refreshUser();
      resetClaimStatus();
    }
  }, [claimStatus, refreshUser, resetClaimStatus]);

  const claims = user?.pending_claims ?? [];
  if (claims.length === 0) {
    return (
      <Card className="px-4 py-6 text-center text-sm text-text-muted">
        No rewards to claim right now. Keep playing!
      </Card>
    );
  }

  const claiming = claimStatus === 'awaiting_wallet' || claimStatus === 'confirming' || claimStatus === 'submitting';

  return (
    <div className="space-y-2">
      {(claimStatus === 'rejected' || claimStatus === 'error') && (
        <p className="px-1 text-xs text-accent-red">
          {claimStatus === 'rejected'
            ? 'Claim cancelled. You can try again.'
            : 'Something went wrong. Please try again.'}
        </p>
      )}
      {claims.map((c) => {
        const fmt = formatClaim(c);
        const isThis = claimingId === c.payout_id;
        return (
          <Card key={c.payout_id} className="overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-gold/15">
                <Trophy className="h-6 w-6 text-accent-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold">{payoutLabel(c.payout_type)}</h3>
                {fmt ? (
                  <p className="text-xs text-text-muted">
                    <span className="font-semibold text-text-secondary">{fmt.usd}</span>
                    {' · '}
                    {fmt.amount} {fmt.symbol}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">Unsupported payout token</p>
                )}
              </div>
              <Button
                size="sm"
                disabled={!fmt || claiming}
                onClick={() => {
                  void claim(c);
                }}
              >
                {isThis && claiming ? 'Claiming…' : 'Claim'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
