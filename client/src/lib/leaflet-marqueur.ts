import L from 'leaflet';

/**
 * Marqueur Leaflet par défaut, dessiné en SVG inline.
 *
 * Les marqueurs étaient auparavant chargés depuis deux CDN différents — cdnjs
 * dans MapView, unpkg dans AgentDashboard. Trois raisons d'arrêter :
 *
 * 1. Sur une connexion mobile congolaise, trois requêtes vers un domaine tiers
 *    coûtent du temps et des données avant que la carte n'affiche quoi que ce
 *    soit ; si le CDN est lent ou bloqué, les marqueurs n'apparaissent jamais.
 * 2. Chaque requête vers un CDN transmet le référent — donc la page consultée —
 *    à un tiers.
 * 3. Le paquet npm `leaflet` 1.9.4 ne livre pas ces images : il n'y avait donc
 *    pas d'option locale sans ajouter des binaires au dépôt.
 *
 * Le SVG pèse quelques centaines d'octets, part avec le bundle, et se colore
 * depuis les variables de thème.
 */

const svgMarqueur = (couleur: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"
        fill="${couleur}"/>
  <circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/>
</svg>`.trim();

function creerMarqueur(couleur: string): L.DivIcon {
  return L.divIcon({
    className: 'marqueur-villago',
    html: svgMarqueur(couleur),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
}

export const marqueurParDefaut = creerMarqueur('#2F6F4E');
export const marqueurSelectionne = creerMarqueur('#C2410C');

/** Remplace le marqueur par défaut de Leaflet, qui pointe vers un CDN. */
export function installerMarqueurParDefaut(): void {
  L.Marker.prototype.options.icon = marqueurParDefaut;
}
