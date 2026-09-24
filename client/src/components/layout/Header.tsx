import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, Moon, Sun, Monitor, LogIn, LogOut, Check, MessageCircle, House, ChevronRight, Search, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { PaginatedResponse, Notification, ChatRoom } from '@shared/schema';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'bien_valide':
    case 'bien_rejete':
      return House;
    case 'nouveau_message':
    case 'agent_ajoute_chat':
      return MessageCircle;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'bien_valide':
    case 'demande_acceptee':
    case 'visite_terminee':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'bien_rejete':
    case 'demande_rejetee':
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    case 'nouveau_message':
    case 'agent_ajoute_chat':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false);

  const getDesktopNavItems = () => {
    if (!isAuthenticated) {
      return [
        { href: '/', icon: House, label: 'Accueil' },
        { href: '/search', icon: Search, label: 'Recherche' },
      ];
    }
    
    switch (user?.role) {
      case 'proprietaire':
        return [
          { href: '/', icon: House, label: 'Accueil' },
          { href: '/search', icon: Search, label: 'Recherche' },
          { href: '/my-properties', icon: Building2, label: 'Mes biens' },
        ];
      case 'commissionnaire':
        return [
          { href: '/', icon: House, label: 'Accueil' },
          { href: '/search', icon: Search, label: 'Recherche' },
          { href: '/pending-properties', icon: Building2, label: 'Dashboard' },
        ];
      case 'agent':
        return [
          { href: '/agent-dashboard', icon: House, label: 'Dashboard' },
          { href: '/search', icon: Search, label: 'Recherche' },
        ];
      default:
        return [
          { href: '/', icon: House, label: 'Accueil' },
          { href: '/search', icon: Search, label: 'Recherche' },
          { href: '/my-visits', icon: Building2, label: 'Mes visites' },
        ];
    }
  };

  const desktopNavItems = getDesktopNavItems();

  const { data: notifications } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['/api/v1/notifications/'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: chatrooms } = useQuery<PaginatedResponse<ChatRoom>>({
    queryKey: ['/api/v1/messaging/chatrooms/'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/notifications/${id}/`, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/'] });
    },
  });

  const unreadNotifications = notifications?.results?.filter(n => !n.is_read) || [];
  const unreadCount = unreadNotifications.length;
  const totalUnreadMessages = chatrooms?.results?.reduce((acc, room) => acc + (room.unread_count || 0), 0) || 0;

  const getInitials = (firstName?: string) => {
    return firstName?.[0]?.toUpperCase() || 'U';
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const displayedNotifications = notifications?.results?.slice(0, 10) || [];
  const hasMoreNotifications = (notifications?.count || 0) > 10;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
                <img src="/logo.png" alt="VillaGo" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-serif font-bold text-xl hidden sm:inline">VillaGo</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {desktopNavItems.map((item) => {
                const isActive = location === item.href || 
                  (item.href !== '/' && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-theme-toggle"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setThemeMode('system')}
                  data-testid="menu-theme-system"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  Système
                  {themeMode === 'system' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setThemeMode('light')}
                  data-testid="menu-theme-light"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Claire
                  {themeMode === 'light' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setThemeMode('dark')}
                  data-testid="menu-theme-dark"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Sombre
                  {themeMode === 'dark' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated ? (
              <>
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-messages">
                    <MessageCircle className="h-5 w-5" />
                    {totalUnreadMessages > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                    )}
                  </Button>
                </Link>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-[calc(100vw-2rem)] sm:w-80 p-0" sideOffset={8}>
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Notifications</h4>
                        {unreadCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="h-[300px]">
                      {displayedNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Bell className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {displayedNotifications.map((notification) => {
                            const Icon = getNotificationIcon(notification.type_notification);
                            return (
                              <div 
                                key={notification.id}
                                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5' : ''}`}
                                onClick={() => {
                                  if (!notification.is_read) {
                                    markAsReadMutation.mutate(notification.id);
                                  }
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type_notification)}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-sm line-clamp-1 ${!notification.is_read ? 'font-semibold' : ''}`}>
                                        {notification.titre}
                                      </p>
                                      {!notification.is_read && (
                                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDate(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                    {hasMoreNotifications && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-center text-sm"
                          onClick={() => setAllNotificationsOpen(true)}
                        >
                          Voir toutes les notifications
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                    {!hasMoreNotifications && displayedNotifications.length > 0 && (
                      <div className="p-2 border-t">
                        <Link href="/notifications">
                          <Button variant="ghost" className="w-full justify-center text-sm">
                            Voir toutes les notifications
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-profile-menu">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photo} alt={user?.username} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user?.first_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem data-testid="menu-profile">
                        Mon profil
                      </DropdownMenuItem>
                    </Link>
                    {user?.role === 'proprietaire' && (
                      <Link href="/my-properties">
                        <DropdownMenuItem data-testid="menu-my-properties">
                          Mes biens
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user?.role === 'commissionnaire' && (
                      <Link href="/pending-properties">
                        <DropdownMenuItem data-testid="menu-dashboard">
                          Dashboard Commissionnaire
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user?.role === 'agent' && (
                      <Link href="/agent-dashboard">
                        <DropdownMenuItem data-testid="menu-dashboard">
                          Dashboard Agent
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user?.role === 'client' && (
                      <Link href="/my-visits">
                        <DropdownMenuItem data-testid="menu-my-visits">
                          Mes visites
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {(user?.role === 'commissionnaire' || user?.role === 'proprietaire') && (
                      <Link href="/">
                        <DropdownMenuItem data-testid="menu-home">
                          <House className="mr-2 h-4 w-4" />
                          Parcourir les biens
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" data-testid="button-login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <Dialog open={allNotificationsOpen} onOpenChange={setAllNotificationsOpen}>
        <DialogContent className="w-[95vw] max-w-lg h-[85vh] max-h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Toutes les notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-2 p-4">
              {notifications?.results?.map((notification) => {
                const Icon = getNotificationIcon(notification.type_notification);
                return (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type_notification)}`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm line-clamp-2 ${!notification.is_read ? 'font-semibold' : ''}`}>
                            {notification.titre}
                          </h4>
                          {!notification.is_read && (
                            <Badge variant="default" className="text-xs flex-shrink-0">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t flex-shrink-0">
            <Link href="/notifications">
              <Button className="w-full" onClick={() => setAllNotificationsOpen(false)}>
                Aller à la page notifications
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
