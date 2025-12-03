import { Home } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary animate-pulse">
            <Home className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="absolute -inset-2 rounded-xl border-2 border-primary/20 animate-ping" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight">VillaGo</h1>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-loading">
            Chargement en cours...
          </p>
        </div>
      </div>
    </div>
  );
}
