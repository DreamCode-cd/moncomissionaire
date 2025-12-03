import { Search, Calendar, Home, Key } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Recherchez",
    description: "Parcourez notre large sélection de propriétés et utilisez nos filtres pour trouver le bien idéal.",
  },
  {
    icon: Calendar,
    title: "Visitez",
    description: "Réservez une visite en ligne directement avec le propriétaire, aux horaires qui vous conviennent.",
  },
  {
    icon: Home,
    title: "Réservez",
    description: "Une fois votre coup de coeur trouvé, réservez votre location en quelques clics.",
  },
  {
    icon: Key,
    title: "Emménagez",
    description: "Récupérez les clés et commencez votre nouvelle vie dans votre nouveau chez-vous.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Comment ça marche
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Trouvez et louez votre prochain logement en 4 étapes simples
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-gradient-to-r from-primary/50 to-primary/10 lg:block" />
              )}
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-8 w-8 text-primary" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
