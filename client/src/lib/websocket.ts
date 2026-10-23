/**
 * WebSockets : notifications et messagerie en temps réel.
 *
 * Un navigateur ne sait pas poser d'en-tête Authorization sur une WebSocket.
 * Le jeton d'accès passait donc dans l'adresse (`?token=…`), et l'adresse
 * était écrite dans la console à chaque connexion. Or Caddy et Render
 * journalisent l'adresse complète : chaque connexion déposait un jeton
 * valable dans leurs journaux (règle 5).
 *
 * Désormais, chaque connexion demande d'abord un ticket à usage unique
 * (`POST /api/v1/auth/ws-ticket/`, le jeton reste dans l'en-tête), valable
 * 30 secondes, et ouvre la WebSocket avec `?ticket=…`. Même journalisé, le
 * ticket ne vaut plus rien. Rien de ce qui circule — adresse, jeton, contenu
 * des messages — n'est écrit dans la console.
 */
import { api } from './api';

const RECONNEXION_MS = 3000;
const RECONNEXION_MAX_MS = 30000;

const getWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_DJANGO_API_URL || '';
  // Convert https:// to wss:// and http:// to ws://
  return apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
};

const estConnecte = () => Boolean(localStorage.getItem('access_token'));

/**
 * Ouvre une WebSocket sur `chemin` avec un ticket neuf, et la rouvre seule
 * après une coupure (nouveau ticket à chaque fois), jusqu'à `fermer()`.
 */
class ConnexionAvecTicket {
  private ws: WebSocket | null = null;
  private minuterie: ReturnType<typeof setTimeout> | null = null;
  private arretee = false;
  private echecs = 0;
  ouverte = false;

  constructor(
    private chemin: string,
    private evenements: {
      onMessage: (data: any) => void;
      onError?: (erreur: unknown) => void;
    },
  ) {}

  ouvrir() {
    this.arretee = false;
    void this.essayer();
  }

  private async essayer() {
    if (this.arretee || !estConnecte()) return;
    let ticket: string;
    try {
      ({ ticket } = await api.post<{ ticket: string }>('/api/v1/auth/ws-ticket/'));
    } catch {
      // Hors ligne ou session expirée : on réessaie plus tard.
      this.planifier();
      return;
    }
    // Fermée pendant la demande du ticket (page quittée) : on n'ouvre pas.
    if (this.arretee) return;

    const ws = new WebSocket(`${getWebSocketUrl()}${this.chemin}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.echecs = 0;
      this.ouverte = true;
    };
    ws.onmessage = (event) => {
      try {
        this.evenements.onMessage(JSON.parse(event.data));
      } catch {
        // Le contenu n'est pas journalisé : il peut s'agir d'un message privé.
        console.error('[WebSocket] Message illisible ignoré');
      }
    };
    ws.onerror = (erreur) => this.evenements.onError?.(erreur);
    ws.onclose = () => {
      this.ouverte = false;
      if (this.ws === ws) this.ws = null;
      this.planifier();
    };
  }

  private planifier() {
    if (this.arretee) return;
    this.echecs += 1;
    // 3 s, 6 s, 12 s… jusqu'à 30 s : sur une connexion qui tombe souvent,
    // inutile de marteler le serveur.
    const delai = Math.min(RECONNEXION_MS * 2 ** (this.echecs - 1), RECONNEXION_MAX_MS);
    this.minuterie = setTimeout(() => void this.essayer(), delai);
  }

  envoyer(donnees: unknown): boolean {
    if (this.ws && this.ouverte) {
      this.ws.send(JSON.stringify(donnees));
      return true;
    }
    return false;
  }

  fermer() {
    this.arretee = true;
    if (this.minuterie) clearTimeout(this.minuterie);
    this.ws?.close();
    this.ws = null;
    this.ouverte = false;
  }
}

// ============ NOTIFICATION SOCKET ============
export class NotificationSocket {
  private connexion: ConnexionAvecTicket;

  constructor(
    onNotification: (notification: any) => void,
    onUnreadCount: (count: number) => void
  ) {
    this.connexion = new ConnexionAvecTicket('/ws/notifications/', {
      onMessage: (data) => {
        switch (data.type) {
          case 'connected':
            onUnreadCount(data.unread_count || 0);
            break;
          case 'new_notification':
            onNotification(data.notification);
            onUnreadCount(data.unread_count || 0);
            break;
          case 'notification_read':
          case 'all_read':
          case 'unread_count':
            onUnreadCount(data.unread_count || 0);
            break;
        }
      },
    });
  }

  connect() {
    this.connexion.ouvrir();
  }

  markAsRead(notificationId: number) {
    this.connexion.envoyer({ action: 'mark_read', notification_id: notificationId });
  }

  markAllAsRead() {
    this.connexion.envoyer({ action: 'mark_all_read' });
  }

  disconnect() {
    this.connexion.fermer();
  }
}

// ============ CHAT SOCKET ============
export class ChatSocket {
  private connexion: ConnexionAvecTicket;

  constructor(
    roomId: number,
    onMessage: (message: any) => void,
    onError?: (error: any) => void
  ) {
    this.connexion = new ConnexionAvecTicket(`/ws/chat/${roomId}/`, {
      onMessage: (data) => {
        if (data.type === 'message') {
          onMessage({
            id: data.message_id,
            content: data.message,
            sender: data.sender_id,
            sender_detail: {
              id: data.sender_id,
              full_name: data.sender_name,
              user_type: data.sender_type,
              user_type_display: data.sender_type_display,
            },
            created_at: data.timestamp,
            is_read: false,
          });
        }
      },
      onError,
    });
  }

  connect() {
    this.connexion.ouvrir();
  }

  sendMessage(message: string) {
    return this.connexion.envoyer({ message });
  }

  disconnect() {
    this.connexion.fermer();
  }

  get connected() {
    return this.connexion.ouverte;
  }
}
