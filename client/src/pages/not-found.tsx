import { Link } from "wouter";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">VillaGo</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-8xl font-bold text-primary">404</p>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Page non trouvée
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/">
              <Button className="gap-2" data-testid="button-go-home">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </Button>
            </Link>
            <Link href="/properties">
              <Button variant="outline" className="gap-2" data-testid="button-search-properties">
                <Search className="h-4 w-4" />
                Rechercher des biens
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
