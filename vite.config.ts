import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1700,
    // Pas de manualChunks. Le découpage par paquet mettait React dans un
    // morceau et ses propres dépendances (scheduler…) dans un autre, tandis
    // que tout chemin contenant « react » (@radix-ui/react-*, lucide-react,
    // react-hook-form…) rejoignait React : les morceaux s'importaient l'un
    // l'autre, et selon l'ordre de chargement React était encore indéfini —
    // « Cannot read properties of undefined (reading 'useState') », page
    // blanche en production. Le serveur de développement ne découpe rien,
    // d'où l'absence du défaut en local. Le découpage par page, lui, vient
    // des imports différés (lazy) et reste sûr.
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
