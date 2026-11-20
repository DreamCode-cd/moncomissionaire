import { Link, useLocation } from 'wouter';
import { House, Search, MessageCircle, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const publicNavItems = [
  { href: '/', icon: House, get label() { return t('nav.accueil'); } },
  { href: '/search', icon: Search, get label() { return t('nav.recherche'); } },
];

const clientNavItems = [
  { href: '/', icon: House, get label() { return t('nav.accueil'); } },
  { href: '/search', icon: Search, get label() { return t('nav.recherche'); } },
  { href: '/my-visits', icon: Building2, get label() { return t('nav.visites'); } },
  // Seule entrée vers la messagerie sur téléphone : l'icône de l'en-tête y
  // est masquée pour ne pas doublonner.
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

const proprietaireNavItems = [
  { href: '/', icon: House, get label() { return t('nav.accueil'); } },
  { href: '/my-properties', icon: Building2, get label() { return t('nav.mesBiens'); } },
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

const commissionnaireNavItems = [
  { href: '/', icon: House, get label() { return t('nav.accueil'); } },
  { href: '/mon-portefeuille', icon: Building2, get label() { return t('nav.portefeuille'); } },
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

// Trois administrateurs interviennent depuis leur téléphone : l'administration
// et la modération doivent être à un pouce.
const adminNavItems = [
  { href: '/administration', icon: House, get label() { return t('nav.admin'); } },
  { href: '/moderation', icon: Building2, get label() { return t('nav.moderation'); } },
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

const moderateurNavItems = [
  { href: '/', icon: House, get label() { return t('nav.accueil'); } },
  { href: '/moderation', icon: Building2, get label() { return t('nav.moderation'); } },
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

const agentNavItems = [
  { href: '/agent-dashboard', icon: House, get label() { return t('nav.mesVisites'); } },
  { href: '/messages', icon: MessageCircle, get label() { return t('nav.messages'); } },
  { href: '/profile', icon: User, get label() { return t('nav.compte'); } },
];

export function MobileNav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const getNavItems = () => {
    if (!isAuthenticated) return publicNavItems;
    
    switch (user?.role) {
      case 'proprietaire':
      case 'agence':
        return proprietaireNavItems;
      case 'commissionnaire':
        return commissionnaireNavItems;
      case 'moderateur':
        return moderateurNavItems;
      case 'admin':
        return adminNavItems;
      case 'agent':
        return agentNavItems;
      default:
        return clientNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== '/' && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                data-testid={`nav-${item.href.replace(/\W/g, '') || 'accueil'}`}
              >
                <item.icon 
                  className={cn(
                    "w-6 h-6 mb-1",
                    isActive && "fill-primary/20"
                  )} 
                />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
