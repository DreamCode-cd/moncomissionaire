import { Link } from 'wouter';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="text-center max-w-md">
        <img src="/logo.png" alt="VillaGo" className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover" />
        
        <h1 className="text-7xl font-bold text-primary mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold mb-3">Page introuvable</h2>
        
        <p className="text-muted-foreground mb-8">
          Oups ! La page que vous recherchez n'existe pas ou a été déplacée. 
          Retournez à l'accueil pour découvrir nos propriétés.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Rechercher un bien
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Page précédente
          </Button>
        </div>
      </div>
    </div>
  );
}
