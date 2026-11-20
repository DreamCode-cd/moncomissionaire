import { createRoot } from "react-dom/client";
import App from "./App";
import { chargerLangue, langueActive } from "./i18n";
// Même police que l'application mobile, embarquée avec le site : un seul
// fichier variable de 34 Ko pour l'alphabet latin, mis en cache une fois.
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Le dictionnaire de la langue choisie avant le premier affichage : pas de
// passage du français à l'anglais sous les yeux de l'utilisateur.
chargerLangue(langueActive())
  .catch(() => {})
  .finally(() => createRoot(document.getElementById("root")!).render(<App />));
