import { API_BASE_URL, AUTH_TOKEN_KEY, type AuthTokens } from "@shared/schema";

function getTokens(): AuthTokens | null {
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function setTokens(tokens: AuthTokens) {
  localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens));
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    setTokens({ access: data.access, refresh: tokens.refresh });
    return data.access;
  } catch {
    return null;
  }
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  requireAuth?: boolean;
  headers?: Record<string, string>;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, requireAuth = false, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const tokens = getTokens();
  if (tokens?.access) {
    requestHeaders.Authorization = `Bearer ${tokens.access}`;
  } else if (requireAuth) {
    throw new Error("Non authentifié");
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && tokens?.refresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `Erreur ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function apiGet<T = unknown>(endpoint: string, requireAuth = false): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET", requireAuth });
}

export async function apiPost<T = unknown>(endpoint: string, body: unknown, requireAuth = true): Promise<T> {
  return apiRequest<T>(endpoint, { method: "POST", body, requireAuth });
}

export async function apiPut<T = unknown>(endpoint: string, body: unknown, requireAuth = true): Promise<T> {
  return apiRequest<T>(endpoint, { method: "PUT", body, requireAuth });
}

export async function apiPatch<T = unknown>(endpoint: string, body: unknown, requireAuth = true): Promise<T> {
  return apiRequest<T>(endpoint, { method: "PATCH", body, requireAuth });
}

export async function apiDelete(endpoint: string, requireAuth = true): Promise<void> {
  return apiRequest<void>(endpoint, { method: "DELETE", requireAuth });
}

export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}
