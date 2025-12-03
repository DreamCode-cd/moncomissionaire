import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, User, Home, LogOut, Calendar, Building, Heart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

const navigation = [
  { name: "Accueil", href: "/" },
  { name: "Propriétés", href: "/properties" },
  { name: "Comment ça marche", href: "/how-it-works" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    const first = user.first_name?.[0] || "";
    const last = user.last_name?.[0] || "";
    return (first + last).toUpperCase() || user.username[0].toUpperCase();
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    return user.role === "proprietaire" ? "/dashboard/owner" : "/dashboard/client";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">VillaGo</span>
          </Link>
        </div>

        <div className="hidden md:flex md:items-center md:gap-1">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={location === item.href ? "bg-accent" : ""}
                data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.name}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/properties">
            <Button variant="ghost" size="icon" data-testid="button-search-header">
              <Search className="h-5 w-5" />
              <span className="sr-only">Rechercher</span>
            </Button>
          </Link>

          <ThemeToggle />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profile_picture} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link href={getDashboardLink()}>
                  <DropdownMenuItem data-testid="link-dashboard">
                    <Building className="mr-2 h-4 w-4" />
                    Tableau de bord
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/client/bookings">
                  <DropdownMenuItem data-testid="link-my-bookings">
                    <Calendar className="mr-2 h-4 w-4" />
                    Mes réservations
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/client/favorites">
                  <DropdownMenuItem data-testid="link-favorites">
                    <Heart className="mr-2 h-4 w-4" />
                    Favoris
                  </DropdownMenuItem>
                </Link>
                <Link href="/profile">
                  <DropdownMenuItem data-testid="link-profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Link href="/login">
                <Button variant="ghost" data-testid="link-login">
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button data-testid="link-register">
                  S'inscrire
                </Button>
              </Link>
            </div>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SheetTitle className="px-6 py-4 border-b">Menu</SheetTitle>
              <div className="flex flex-col">
                <div className="flex flex-col gap-1 p-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${location === item.href ? "bg-accent" : ""}`}
                        data-testid={`link-mobile-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
                
                {!isAuthenticated && (
                  <>
                    <div className="border-t px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full" data-testid="link-mobile-login">
                            Connexion
                          </Button>
                        </Link>
                        <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="w-full" data-testid="link-mobile-register">
                            S'inscrire
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {isAuthenticated && (
                  <>
                    <div className="border-t px-4 py-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.profile_picture} alt={user?.username} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Building className="mr-2 h-4 w-4" />
                            Tableau de bord
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive"
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Déconnexion
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
