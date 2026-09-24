import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// En production, une variable DJANGO_API_URL absente faisait basculer le
// serveur sur ses données de démonstration : faux biens, faux utilisateurs, et
// une authentification qui acceptait n'importe quel mot de passe. Le seul signe
// visible était une ligne dans les journaux. On refuse désormais de démarrer.
if (process.env.NODE_ENV === "production" && !process.env.DJANGO_API_URL) {
  console.error(
    "\n[villago] DÉMARRAGE INTERROMPU\n" +
      "  DJANGO_API_URL n'est pas définie alors que NODE_ENV vaut « production ».\n" +
      "  Sans elle, le serveur servirait des données fictives au lieu de l'API réelle.\n" +
      "  Renseignez l'URL de l'API Django, par exemple :\n" +
      "      DJANGO_API_URL=https://api.villago.cd\n",
  );
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Security headers middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Skip body parsing for proxied API routes to allow proxy to forward raw body
const shouldParseBody = (req: Request) => {
  // Don't parse body for /api/v1 routes when proxying to Django
  const DJANGO_API_URL = process.env.DJANGO_API_URL;
  if (DJANGO_API_URL && req.path.startsWith('/api/v1')) {
    return false;
  }
  return true;
};

app.use((req, res, next) => {
  if (!shouldParseBody(req)) {
    return next();
  }
  express.json({
    verify: (innerReq, _res, buf) => {
      innerReq.rawBody = buf;
    },
  })(req, res, next);
});

app.use((req, res, next) => {
  if (!shouldParseBody(req)) {
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Journal d'accès : méthode, chemin, statut, durée. Rien de plus.
// La version précédente sérialisait le corps JSON de TOUTES les réponses /api,
// ce qui déversait les jetons d'accès et de rafraîchissement renvoyés par la
// connexion, ainsi que les profils et les conversations, en clair dans les
// journaux du conteneur.
app.use((req, res, next) => {
  const debut = Date.now();
  const chemin = req.path;

  res.on("finish", () => {
    if (chemin.startsWith("/api")) {
      log(`${req.method} ${chemin} ${res.statusCode} en ${Date.now() - debut}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const statut = err.status || err.statusCode || 500;

    // `throw err` suivait cet envoi : l'exception remontait hors du cycle
    // Express, devenait un uncaughtException et arrêtait le processus. On
    // journalise à la place.
    console.error(`[erreur] ${req.method} ${req.path} ${statut}`, err);

    if (res.headersSent) {
      return;
    }

    // Le message d'une erreur serveur peut contenir un chemin de fichier, une
    // requête SQL ou un identifiant : il ne sort pas vers le client.
    res.status(statut).json({
      message:
        statut >= 500
          ? "Une erreur interne est survenue."
          : err.message || "Requête invalide.",
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      // reusePort supprimé — non supporté sur Windows/certains environnements (ENOTSUP)
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();