import { Link } from "wouter";
import { Search, Calendar, Home, Key, CheckCircle, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Search,
    title: "1. Recherchez votre logement",
    description:
      "Utilisez nos filtres avancés pour trouver le bien qui correspond à vos critères : localisation, budget, nombre de chambres, équipements...",
    features: [
      "Plus de 1000 propriétés vérifiées",
      "Filtres de recherche avancés",
      "Photos HD et visites virtuelles",
      "Informations détaillées sur chaque bien",
    ],
  },
  {
    icon: Calendar,
    title: "2. Réservez une visite",
    description:
      "Planifiez une visite directement avec le propriétaire. Choisissez un créneau qui vous convient parmi les disponibilités proposées.",
    features: [
      "Réservation en ligne 24h/24",
      "Créneaux flexibles",
      "Confirmation instantanée",
      "Rappels automatiques",
    ],
  },
  {
    icon: Home,
    title: "3. Faites votre demande",
    description:
      "Vous avez trouvé le bien idéal ? Envoyez une demande de location au propriétaire avec votre dossier complet.",
    features: [
      "Dossier dématérialisé",
      "Communication directe avec le propriétaire",
      "Suivi de votre demande en temps réel",
      "Contrat sécurisé",
    ],
  },
  {
    icon: Key,
    title: "4. Emménagez",
    description:
      "Une fois votre demande acceptée, finalisez les formalités et récupérez les clés de votre nouveau logement.",
    features: [
      "État des lieux simplifié",
      "Accompagnement personnalisé",
      "Remise des clés sécurisée",
      "Support client disponible",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Comment fonctionne VillaGo ?
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Trouvez et louez votre prochain logement en 4 étapes simples.
                Notre plateforme vous accompagne à chaque étape du processus.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
            <div className="space-y-12">
              {steps.map((step, index) => (
                <div key={step.title} className="relative">
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 h-[calc(100%+48px)] w-0.5 bg-gradient-to-b from-primary to-primary/20 hidden md:block" />
                  )}
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-2">
                        <div className="p-6 md:p-8">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                              <step.icon className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold">{step.title}</h2>
                          </div>
                          <p className="mt-4 text-muted-foreground">{step.description}</p>
                        </div>
                        <div className="bg-muted/50 p-6 md:p-8">
                          <ul className="space-y-3">
                            {step.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">
              Prêt à trouver votre logement idéal ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Rejoignez les milliers de locataires qui ont trouvé leur bonheur sur VillaGo.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/properties">
                <Button size="lg" className="gap-2" data-testid="button-search-now">
                  Rechercher maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" data-testid="button-create-account">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
