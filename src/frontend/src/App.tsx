import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAccount, useReconnect } from 'wagmi';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppStoreProvider } from '@/store/AppStore';
import { FixturePage } from '@/pages/FixturePage';
import { StandingsPage } from '@/pages/StandingsPage';
import { GamesPage } from '@/pages/GamesPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LandingPage } from '@/pages/LandingPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/TermsOfServicePage';
import { useAuth } from '@/hooks/useAuth';

export default function App() {
  const { authStatus } = useAuth();
  const { address } = useAccount();
  const { reconnect } = useReconnect();

  // Auto-reconnect any injected wallet (e.g. MiniPay) on first load.
  useEffect(() => {
    const eth = (window as unknown as { ethereum?: unknown }).ethereum;
    if (eth) reconnect();
  }, [reconnect]);

  const isSignedIn = authStatus === 'signed_in';

  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      {!isSignedIn && (
        <Route path="*" element={<LandingPage address={address} />} />
      )}
      {isSignedIn && (
        <Route
          element={
            <AppStoreProvider>
              <AppLayout />
            </AppStoreProvider>
          }
        >
          <Route index element={<Navigate to="/fixture" replace />} />
          <Route path="/fixture" element={<FixturePage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/fixture" replace />} />
        </Route>
      )}
    </Routes>
  );
}
