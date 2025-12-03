import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    id: 1,
    name: "Marie Dupont",
    role: "Locataire",
    avatar: "",
    rating: 5,
    comment:
      "VillaGo m'a permis de trouver l'appartement parfait en moins d'une semaine. Le processus de réservation était simple et le propriétaire très réactif.",
  },
  {
    id: 2,
    name: "Pierre Martin",
    role: "Propriétaire",
    avatar: "",
    rating: 5,
    comment:
      "En tant que propriétaire, je suis ravi de la plateforme. La gestion des réservations est intuitive et j'ai trouvé des locataires sérieux rapidement.",
  },
  {
    id: 3,
    name: "Sophie Bernard",
    role: "Locataire",
    avatar: "",
    rating: 5,
    comment:
      "La visite virtuelle m'a fait gagner un temps précieux. J'ai pu visiter plusieurs biens depuis chez moi avant de me déplacer pour les finalistes.",
  },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-20 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Ce que disent nos utilisateurs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Des milliers de clients nous font confiance pour trouver leur logement
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="relative overflow-hidden">
              <CardContent className="p-6">
                <Quote className="absolute right-4 top-4 h-8 w-8 text-muted-foreground/20" />
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < testimonial.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  "{testimonial.comment}"
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
