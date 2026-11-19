import type { ReactNode } from 'react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';
import { BandeauHorsLigne } from './BandeauHorsLigne';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  /** La page a sa propre barre d'action fixée en bas (fiche d'un bien). */
  barreAction?: boolean;
}

export function Layout({ children, hideNav = false, barreAction = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BandeauHorsLigne />
      <NotificationPermissionBanner />
      <Header />
      <main className="flex-1 pb-6">
        {children}
      </main>
      <Footer avecBarreDuBas={!hideNav} barreAction={barreAction} />
      {!hideNav && <MobileNav />}
    </div>
  );
}
