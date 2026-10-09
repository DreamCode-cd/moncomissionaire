import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { api } from "./api";
import { ErreurApi, erreurPassagere } from "./erreurs";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

function buildUrl(queryKey: readonly unknown[]): string {
  const pathParts: string[] = [];
  let params: Record<string, string> = {};
  
  for (const part of queryKey) {
    if (typeof part === 'string') {
      // Une clé peut porter ses paramètres (« /mandats/?statut=propose ») :
      // ils rejoignent les autres au lieu de recevoir la barre oblique finale.
      // Sans cela, l'URL devenait « ?statut=propose/ » et Django refusait la
      // valeur « propose/ » (400).
      const [chemin, requete] = part.split('?', 2);
      if (requete) {
        params = { ...params, ...Object.fromEntries(new URLSearchParams(requete)) };
      }
      const trimmed = chemin.replace(/^\/+|\/+$/g, '');
      if (trimmed) {
        pathParts.push(trimmed);
      }
    } else if (typeof part === 'number') {
      pathParts.push(String(part));
    } else if (typeof part === 'object' && part !== null) {
      params = { ...params, ...(part as Record<string, string>) };
    }
  }
  
  let url = '/' + pathParts.join('/') + '/';
  url = url.replace(/\/+/g, '/');
  
  const paramEntries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (paramEntries.length > 0) {
    const searchParams = new URLSearchParams(paramEntries);
    url += '?' + searchParams.toString();
  }
  
  return url;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const url = buildUrl(queryKey);
    
    try {
      return await api.get<T>(url);
    } catch (error) {
      if (error instanceof ErreurApi && error.statut === 401) {
        if (options.on401 === "returnNull") {
          return null as T;
        }
      }
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
      gcTime: 30 * 60 * 1000, // 30 minutes - garder en cache
      // Réessayer seulement quand le serveur n'a pas pu répondre (réseau,
      // serveur qui redémarre). Un 403 ou un 404 redonnerait la même chose.
      retry: (tentatives, erreur) => tentatives < 2 && erreurPassagere(erreur),
      retryDelay: (tentative) => 1500 * (tentative + 1),
    },
    mutations: {
      retry: false,
    },
  },
});
