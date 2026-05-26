import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, LogIn, UserPlus } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { SignUpModal } from '@/components/auth/SignUpModal';
import { useAuth } from '@/hooks/useAuth';
import { modal as walletModal } from '@/lib/wagmi';

function shortenAddress(addr: string | undefined): string {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

interface LandingPageProps {
  address: string | undefined;
}

export function LandingPage({ address }: LandingPageProps) {
  const { authStatus, authError, signIn, signUp, checkName } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  const isLoading = authStatus === 'loading';
  const isConnected = authStatus !== 'no_wallet' && authStatus !== 'loading';
  const isRegistered = authStatus === 'registered';
  const isNotRegistered = authStatus === 'not_registered';

  async function handleSignUpSubmit(name: string, flag: string) {
    await signUp(name, flag);
    setShowSignUp(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg-base">
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-12">
        <div className="absolute inset-0 -z-10 bg-stadium-gradient" />

        {address && (
          <div className="chip absolute left-4 top-4 text-xs">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <span className="font-mono text-text-secondary">
              {shortenAddress(address)}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <Logo showWordmark={false} className="scale-150" />
          <div className="mt-2 text-3xl font-extrabold tracking-tight">
            <span className="text-text-primary">Cup</span>
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              Master
            </span>
          </div>
          <p className="max-w-xs text-balance text-center text-sm text-text-muted">
            Predict the FIFA World Cup 2026. Climb the leaderboard. Win
            rewards.
          </p>
        </div>

        <div className="mt-10 flex w-full flex-col items-center gap-3">
          {isLoading && (
            <div className="text-sm text-text-muted">Checking session…</div>
          )}

          {!isLoading && !isConnected && (
            <Button
              size="lg"
              fullWidth
              iconLeft={<Wallet className="h-4 w-4" />}
              onClick={() => {
                void walletModal.open();
              }}
            >
              Connect Wallet
            </Button>
          )}

          {!isLoading && isRegistered && (
            <Button
              size="lg"
              fullWidth
              iconLeft={<LogIn className="h-4 w-4" />}
              onClick={() => {
                void signIn();
              }}
            >
              Sign In
            </Button>
          )}

          {!isLoading && isNotRegistered && (
            <Button
              size="lg"
              fullWidth
              iconLeft={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                setShowSignUp(true);
              }}
            >
              Sign Up
            </Button>
          )}

          {authError && (
            <div className="w-full rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-center text-xs font-semibold text-accent-red">
              {authError}
            </div>
          )}
        </div>
      </main>

      <footer className="safe-bottom sticky bottom-0 z-10 border-t border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold text-text-muted">
          <span className="tracking-wide">Operated by CupMaster</span>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

      <SignUpModal
        open={showSignUp}
        onClose={() => {
          setShowSignUp(false);
        }}
        onSubmit={handleSignUpSubmit}
        checkName={checkName}
      />
    </div>
  );
}
