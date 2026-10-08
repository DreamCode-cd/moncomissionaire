import { ErreurApi, ErreurReseau, erreurDepuisReponse } from './erreurs';

const API_URL = import.meta.env.VITE_API_URL || '';

/** Au-delà, on abandonne et on le dit. Large : le serveur de test (Render,
 *  offre gratuite) met plusieurs dizaines de secondes à se réveiller. */
const DELAI_MAX_MS = 60_000;

/** Prévient l'application que la session est perdue (voir AuthContext). */
export const EVENEMENT_SESSION_EXPIREE = 'villago:session-expiree';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  /** Un seul rafraîchissement à la fois. Le serveur invalide un jeton de
   *  rafraîchissement dès qu'il a servi : deux requêtes qui rafraîchissent
   *  en même temps avec le même jeton, et la seconde déconnecte
   *  l'utilisateur. */
  private rafraichissementEnCours: Promise<boolean> | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return Promise.resolve(false);
    if (!this.rafraichissementEnCours) {
      this.rafraichissementEnCours = this.rafraichir().finally(() => {
        this.rafraichissementEnCours = null;
      });
    }
    return this.rafraichissementEnCours;
  }

  private async rafraichir(): Promise<boolean> {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/v1/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
    } catch {
      // Pas de réseau : la session n'est pas perdue pour autant. On garde
      // les jetons, la prochaine tentative réessaiera.
      throw new ErreurReseau();
    }

    if (response.ok) {
      const data = await response.json();
      // Le serveur fait tourner le jeton de rafraîchissement et invalide
      // l'ancien. Ne garder que le jeton d'accès déconnectait l'utilisateur
      // au deuxième rafraîchissement, soit au bout d'une heure environ.
      this.setTokens(data.access, data.refresh ?? this.refreshToken!);
      return true;
    }

    this.clearTokens();
    window.dispatchEvent(new Event(EVENEMENT_SESSION_EXPIREE));
    return false;
  }

  /** Un appel réseau, avec délai maximal. Toute impossibilité de joindre le
   *  serveur devient une ErreurReseau, avec un message en français. */
  private async envoyer(url: string, init: RequestInit): Promise<Response> {
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), DELAI_MAX_MS);
    try {
      return await fetch(url, { ...init, signal: controleur.signal });
    } catch (erreur) {
      if (controleur.signal.aborted) {
        throw new ErreurReseau('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
      }
      throw new ErreurReseau();
    } finally {
      clearTimeout(minuterie);
    }
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let requestBody: string | FormData | undefined;
    if (body) {
      if (isFormData && body instanceof FormData) {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
      }
    }

    let response = await this.envoyer(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        response = await this.envoyer(`${API_URL}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: requestBody,
        });
      }
    }

    if (!response.ok) {
      const texte = await response.text().catch(() => '');
      let corps: unknown = texte;
      try {
        corps = texte ? JSON.parse(texte) : null;
      } catch {
        // Réponse non JSON (page d'erreur HTML d'un proxy) : on garde le texte.
      }
      throw erreurDepuisReponse(response.status, corps);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, isFormData = false) {
    return this.request<T>(endpoint, { method: 'POST', body, isFormData });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export { ErreurApi, ErreurReseau };
