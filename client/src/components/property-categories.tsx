import { Link } from "wouter";
import { Building, Home as HomeIcon, Building2, Castle, Warehouse, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    type: "villa",
    label: "Villas",
    description: "Résidences luxueuses avec piscine et jardin",
    icon: Castle,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop",
    count: 150,
  },
  {
    type: "appartement",
    label: "Appartements",
    description: "Du studio au grand appartement familial",
    icon: Building,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop",
    count: 320,
  },
  {
    type: "maison",
    label: "Maisons",
    description: "Maisons individuelles avec tout le confort",
    icon: HomeIcon,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
    count: 180,
  },
  {
    type: "penthouse",
    label: "Penthouses",
    description: "Appartements de prestige avec vue panoramique",
    icon: Building2,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
    count: 45,
  },
  {
    type: "loft",
    label: "Lofts",
    description: "Espaces industriels réhabilités au charme unique",
    icon: Warehouse,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
    count: 60,
  },
  {
    type: "duplex",
    label: "Duplex",
    description: "Appartements sur deux niveaux avec terrasse",
    icon: Layers,
    image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=400&h=300&fit=crop",
    count: 85,
  },
];

export function PropertyCategories() {
  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Explorez par catégorie
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Trouvez le type de bien qui correspond à votre style de vie
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.type}
              href={`/properties?property_type=${category.type}`}
              data-testid={`link-category-${category.type}`}
            >
              <Card className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <category.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{category.label}</h3>
                        <p className="text-sm text-white/80">{category.count} biens</p>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
