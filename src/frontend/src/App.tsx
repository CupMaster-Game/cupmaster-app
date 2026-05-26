import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppStoreProvider } from '@/store/AppStore';
import { FixturePage } from '@/pages/FixturePage';
import { StandingsPage } from '@/pages/StandingsPage';
import { GamesPage } from '@/pages/GamesPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';

export default function App() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/fixture" replace />} />
          <Route path="/fixture" element={<FixturePage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/fixture" replace />} />
        </Route>
      </Routes>
    </AppStoreProvider>
  );
}
