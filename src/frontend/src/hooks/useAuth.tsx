import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useWalletInfo } from '@reown/appkit/react';
import { api, getAuthedApi, tokenKey } from '@/lib/api';

// authStatus values:
// - loading:        checking wallet/token state
// - no_wallet:      wallet not connected
// - signed_in:      JWT valid, user data loaded
// - registered:     wallet connected, user exists but no valid JWT
// - not_registered: wallet connected, user not registered
export type AuthStatus =
  | 'loading'
  | 'no_wallet'
  | 'signed_in'
  | 'registered'
  | 'not_registered';

// Mirror of the GET /user response shape — kept as a manual interface so the
// page tree can render even before sign-in / before backend types are inferred.
export interface AuthedUser {
  user_id: string;
  address: string;
  name: string;
  flag: string;
  user_source: string;
  is_banned: boolean;
  created_at: string | Date;
  stats: {
    games_played: number;
    predictions_made: number;
    total_score: number;
  };
}

interface AuthContextValue {
  authStatus: AuthStatus;
  user: AuthedUser | null;
  authError: string | null;
  banned: boolean;
  signIn: () => Promise<void>;
  signUp: (name: string, flag: string) => Promise<void>;
  signOut: () => void;
  checkName: (name: string) => Promise<boolean>;
  refreshUser: () => Promise<AuthedUser | null>;
}

function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false;
  const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } })
    .ethereum;
  return !!eth?.isMiniPay;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function buildSiweMessage(address: string, chainId: number, nonce: string): string {
  return [
    `${window.location.host} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to CupMaster',
    '',
    `URI: ${window.location.origin}`,
    'Version: 1',
    `Chain ID: ${chainId.toString()}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

function describeWalletInfo(
  walletInfo:
    | { name?: string; type?: string }
    | null
    | undefined,
): string {
  if (!walletInfo) return '';
  const name = walletInfo.name ?? '';
  const type = walletInfo.type;
  return ` | ${name}${typeof type === 'string' ? ` (${type})` : ''}`.trimEnd();
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { walletInfo } = useWalletInfo();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      // Wallet was disconnected — reset auth state. The cascade-render warning
      // doesn't apply here because the effect only fires on connection change.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAuthStatus('no_wallet');
      setUser(null);
      setBanned(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      if (!address) return;
      setAuthStatus('loading');
      setAuthError(null);

      const token = localStorage.getItem(tokenKey(address));
      if (token) {
        try {
          const authedApi = getAuthedApi(address);
          if (authedApi) {
            const res = await authedApi.user.$get();
            if (res.ok) {
              const data = (await res.json()) as AuthedUser;
              if (!cancelled) {
                setUser(data);
                setAuthStatus('signed_in');
              }
              return;
            }
            if (res.status === 403) {
              if (!cancelled) setBanned(true);
              return;
            }
          }
        } catch {
          // fall through to re-check registration
        }
        localStorage.removeItem(tokenKey(address));
      }

      try {
        const res = await api.checkuser.$get({
          query: { account: address.toLowerCase() },
        });
        const data = (await res.json()) as { registered: boolean };
        if (!cancelled) {
          setAuthStatus(data.registered ? 'registered' : 'not_registered');
        }
      } catch {
        if (!cancelled) setAuthStatus('not_registered');
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const signIn = useCallback(async () => {
    if (!walletClient || !address) return;
    setAuthError(null);
    try {
      const nonceRes = await api.auth.nonce.$get();
      const { nonce } = await nonceRes.json();

      const message = buildSiweMessage(address, walletClient.chain.id, nonce);
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      const verifyRes = await api.auth.verify.$post({
        json: { message, signature },
      });
      if (verifyRes.status === 403) {
        setBanned(true);
        return;
      }
      if (!verifyRes.ok) {
        const err = (await verifyRes.json()) as { error?: string };
        throw new Error(err.error ?? 'Verification failed');
      }
      const verifyData = (await verifyRes.json()) as { token: string };

      localStorage.setItem(tokenKey(address), verifyData.token);
      const authedApi = getAuthedApi(address);
      if (!authedApi) throw new Error('Failed to build authenticated client');
      const userRes = await authedApi.user.$get();
      const userData = (await userRes.json()) as AuthedUser;

      setUser(userData);
      setAuthStatus('signed_in');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
    }
  }, [walletClient, address]);

  const signUp = useCallback(
    async (name: string, flag: string) => {
      if (!walletClient || !address) return;
      setAuthError(null);
      try {
        const nonceRes = await api.auth.nonce.$get();
        const { nonce } = await nonceRes.json();

        const message = buildSiweMessage(address, walletClient.chain.id, nonce);
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });

        const minipay = isMiniPay();
        const user_source: 'minipay' | 'mobile-web' | 'web' = minipay
          ? 'minipay'
          : isMobileBrowser()
            ? 'mobile-web'
            : 'web';
        const connectorId = connector?.id ?? 'unknown';
        const wallet_info = minipay
          ? 'minipay'
          : `${connectorId}${describeWalletInfo(walletInfo)}`;

        const signupRes = await api.auth.signup.$post({
          json: { message, signature, name, flag, user_source, wallet_info },
        });
        if (!signupRes.ok) {
          const err = (await signupRes.json()) as { error?: string };
          throw new Error(err.error ?? 'Sign up failed');
        }
        const signupData = (await signupRes.json()) as { token: string };

        localStorage.setItem(tokenKey(address), signupData.token);
        const authedApi = getAuthedApi(address);
        if (!authedApi) throw new Error('Failed to build authenticated client');
        const userRes = await authedApi.user.$get();
        const userData = (await userRes.json()) as AuthedUser;

        setUser(userData);
        setAuthStatus('signed_in');
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Sign up failed');
      }
    },
    [walletClient, address, connector, walletInfo],
  );

  const signOut = useCallback(() => {
    if (address) localStorage.removeItem(tokenKey(address));
    setUser(null);
    setBanned(false);
    setAuthStatus(isConnected ? 'registered' : 'no_wallet');
  }, [isConnected, address]);

  const checkName = useCallback(async (name: string) => {
    try {
      const res = await api.auth.checkname.$get({ query: { name } });
      const data = (await res.json()) as
        | { available: boolean }
        | { error: string };
      return 'available' in data ? data.available : false;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!address) return null;
    const authedApi = getAuthedApi(address);
    if (!authedApi) return null;
    try {
      const res = await authedApi.user.$get();
      if (res.ok) {
        const data = (await res.json()) as AuthedUser;
        setUser(data);
        return data;
      }
      if (res.status === 403) setBanned(true);
    } catch {
      // ignore
    }
    return null;
  }, [address]);

  const value: AuthContextValue = {
    authStatus,
    user,
    authError,
    banned,
    signIn,
    signUp,
    signOut,
    checkName,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
