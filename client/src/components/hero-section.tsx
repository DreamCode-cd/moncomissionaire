import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HeroSection() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    navigate(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop')`,
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 text-center md:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Trouvez la maison de
          <span className="block bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            vos rêves
          </span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
          Des villas de luxe aux appartements modernes, découvrez notre sélection exclusive
          de biens à louer dans les plus belles régions.
        </p>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md sm:p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label className="text-left text-sm font-medium text-white/90 block mb-2">
                  <MapPin className="inline mr-1 h-4 w-4" />
                  Destination
                </Label>
                <Input
                  placeholder="Où souhaitez-vous habiter ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/90 border-0 h-12 text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  data-testid="input-hero-search"
                />
              </div>

              <div>
                <Label className="text-left text-sm font-medium text-white/90 block mb-2">
                  <Calendar className="inline mr-1 h-4 w-4" />
                  Date d'emménagement
                </Label>
                <Input
                  type="date"
                  className="bg-white/90 border-0 h-12 text-foreground"
                  data-testid="input-hero-date"
                />
              </div>

              <div>
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

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-white/70">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-lg font-bold text-white">1K+</span>
            </div>
            <span className="text-sm">Propriétés</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-lg font-bold text-white">500+</span>
            </div>
            <span className="text-sm">Propriétaires</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-lg font-bold text-white">10K+</span>
            </div>
            <span className="text-sm">Clients satisfaits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-lg font-bold text-white">4.9</span>
            </div>
            <span className="text-sm">Note moyenne</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
