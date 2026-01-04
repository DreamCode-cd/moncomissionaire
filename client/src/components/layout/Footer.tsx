import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="hidden md:block border-t bg-background py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} VillaGo. Tous droits réservés.
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Conditions d'utilisation
            </Link>
            <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Confidentialité
            </Link>
            <Link href="/legal/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </Link>
            <Link href="/legal/legal" className="text-muted-foreground hover:text-foreground transition-colors">
              Mentions légales
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
