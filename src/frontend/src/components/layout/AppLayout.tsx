import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg-base">
      <TopBar />
      <main className="flex-1 px-4 pb-6 pt-2">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
