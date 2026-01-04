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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core
            if (id.includes("react") || id.includes("react-dom") || id.includes("wouter")) {
              return "react-vendor";
            }
            // UI components
            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("framer-motion")) {
              return "ui-vendor";
            }
            // Charting
            if (id.includes("recharts") || id.includes("d3")) {
              return "chart-vendor";
            }
            // Maps
            if (id.includes("leaflet")) {
              return "map-vendor";
            }
            // Form and validation
            if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) {
              return "form-vendor";
            }
            // Utilities
            if (id.includes("date-fns") || id.includes("clsx") || id.includes("tailwind-merge")) {
              return "utils-vendor";
            }
            // Tanstack
            if (id.includes("@tanstack")) {
              return "tanstack-vendor";
            }
            // PDF
            if (id.includes("jspdf") || id.includes("html2canvas")) {
              return "pdf-vendor";
            }
            // Other node_modules
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
