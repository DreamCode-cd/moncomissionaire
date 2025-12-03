import { useState } from "react";
import { useLocation, Link } from "wouter";
import { MapPin, Users, Search, PlusCircle, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function HeroSection() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchLocation, setSearchLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.set("city", searchLocation);
    navigate(`/properties?${params.toString()}`);
  };

  if (isAuthenticated && user?.role === "proprietaire") {
    return (
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50"></div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8 py-20 text-white">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg">
                Bienvenue {user.first_name}
              </h1>
              <p className="text-xl md:text-2xl text-white/90 drop-shadow">
                Gérez vos propriétés et développez votre activité
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard/owner/property-new">
                <Button size="lg" variant="secondary" className="gap-2 text-base">
                  <PlusCircle className="h-5 w-5" />
                  Ajouter une propriété
                </Button>
              </Link>
              <Link href="/dashboard/owner">
                <Button size="lg" variant="outline" className="gap-2 text-base bg-white/10 hover:bg-white/20 border-white/50 text-white">
                  Voir mes propriétés
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop')] bg-cover bg-center"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50"></div>

      <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8 py-20 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg">
              Trouvez votre logement idéal
            </h1>
            <p className="text-xl md:text-2xl text-white/90 drop-shadow">
              Des milliers de propriétés vous attendent
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <div className="relative flex justify-center items-center bg-white/10 backdrop-blur-md p-4 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <div className="lg:col-span-1">
                  <Label className="text-left text-sm font-medium text-white/90 block mb-2">
                    <MapPin className="inline mr-1 h-4 w-4" />
                    Destination
                  </Label>
                  <Input
                    placeholder="Ville, quartier..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="bg-white/90 border-0 h-12 text-foreground placeholder:text-muted-foreground focus:ring-transparent"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-hero-search"
                  />
                </div>
                <div className="lg:col-span-1">
                  <Label className="text-left text-sm font-medium text-white/90 block mb-2">
                    <Calendar className="inline mr-1 h-4 w-4" />
                    Date d'emménagement
                  </Label>
                  <Input
                    type="date"
                    className="bg-white/90 border-0 h-12 text-foreground focus:ring-transparent"
                    data-testid="input-hero-date"
                  />
                </div>
                <div className="lg:col-span-1">
                  <Label className="text-left text-sm font-medium text-white/90 block mb-2">
                    <Users className="inline mr-1 h-4 w-4" />
                    Occupants
                  </Label>
                  <div className="flex h-12 items-center">
                    <Button
                      onClick={handleSearch}
                      className="h-12 w-full gap-2 text-base"
                      data-testid="button-hero-search"
                    >
                      <Search className="h-5 w-5" />
                      Rechercher
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}