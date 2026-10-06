import { Link, useLocation } from 'wouter';
import { House, Search, MessageCircle, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const publicNavItems = [
  { href: '/', icon: House, label: 'Accueil' },
  { href: '/search', icon: Search, label: 'Recherche' },
];

const clientNavItems = [
  { href: '/', icon: House, label: 'Accueil' },
  { href: '/search', icon: Search, label: 'Recherche' },
  { href: '/my-visits', icon: Building2, label: 'Visites' },
  { href: '/profile', icon: User, label: 'Profil' },
];

const proprietaireNavItems = [
  { href: '/', icon: House, label: 'Accueil' },
  { href: '/my-properties', icon: Building2, label: 'Mes biens' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

const commissionnaireNavItems = [
  { href: '/', icon: House, label: 'Accueil' },
  { href: '/mon-portefeuille', icon: Building2, label: 'Portefeuille' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

// Trois administrateurs interviennent depuis leur téléphone : l'administration
// et la modération doivent être à un pouce.
const adminNavItems = [
  { href: '/administration', icon: House, label: 'Admin' },
  { href: '/moderation', icon: Building2, label: 'Modération' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

const moderateurNavItems = [
  { href: '/', icon: House, label: 'Accueil' },
  { href: '/moderation', icon: Building2, label: 'Modération' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

const agentNavItems = [
  { href: '/agent-dashboard', icon: House, label: 'Dashboard' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

export function MobileNav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const getNavItems = () => {
    if (!isAuthenticated) return publicNavItems;
    
    switch (user?.role) {
      case 'proprietaire':
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
                data-testid={`nav-${item.label.toLowerCase()}`}
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
