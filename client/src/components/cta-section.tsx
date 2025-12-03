import { Link } from "wouter";
import { ArrowRight, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground md:p-12">
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Home className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-serif text-2xl font-bold md:text-3xl">
                Vous êtes propriétaire ?
              </h3>
              <p className="mt-4 text-primary-foreground/80">
                Publiez votre annonce gratuitement et trouvez des locataires de qualité. 
                Gérez vos réservations et vos visites depuis notre plateforme intuitive.
              </p>
              <Link href="/register?role=proprietaire">
                <Button
                  variant="secondary"
                  className="mt-6 gap-2"
                  data-testid="button-become-owner"
                >
                  Publier une annonce
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -top-10 right-20 h-20 w-20 rounded-full bg-white/10" />
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent/80 p-8 text-accent-foreground md:p-12">
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-serif text-2xl font-bold md:text-3xl">
                Vous cherchez à louer ?
              </h3>
              <p className="mt-4 text-accent-foreground/80">
                Parcourez des milliers d'annonces vérifiées, réservez des visites et 
                trouvez le logement de vos rêves en toute simplicité.
              </p>
              <Link href="/properties">
                <Button
                  className="mt-6 gap-2 bg-black/80 text-white hover:bg-black/90"
                  data-testid="button-find-property"
                >
                  Trouver un logement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-black/5" />
            <div className="absolute -top-10 right-20 h-20 w-20 rounded-full bg-black/5" />
          </div>
        </div>
      </div>
    </section>
  );
}