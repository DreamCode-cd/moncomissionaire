import { createRoot } from "react-dom/client";
import App from "./App";
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

createRoot(document.getElementById("root")!).render(<App />);
