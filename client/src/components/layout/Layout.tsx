import type { ReactNode } from 'react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function Layout({ children, hideNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NotificationPermissionBanner />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      {!hideNav && <MobileNav />}
    </div>
  );
}
