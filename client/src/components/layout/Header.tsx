import { Link } from 'wouter';
import { Bell, Moon, Sun, Monitor, LogIn, LogOut, Check, MessageCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 md:h-16 items-center justify-between gap-4 px-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <span className="font-serif font-bold text-xl hidden sm:inline">VillaGo</span>
          </div>
        </Link>

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
                </Button>
              </Link>

              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-profile-menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.photo} alt={user?.username} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user?.first_name, user?.last_name)}
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
                    <>
                      <Link href="/pending-properties">
                        <DropdownMenuItem data-testid="menu-dashboard">
                          Dashboard Commissionnaire
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/messages">
                        <DropdownMenuItem data-testid="menu-messages">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Messages
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/notifications">
                        <DropdownMenuItem data-testid="menu-notifications">
                          <Bell className="mr-2 h-4 w-4" />
                          Notifications
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/">
                        <DropdownMenuItem data-testid="menu-home">
                          <Home className="mr-2 h-4 w-4" />
                          Parcourir les biens
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  {user?.role === 'agent' && (
                    <Link href="/dashboard">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
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
  );
}
