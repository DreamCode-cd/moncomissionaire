import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { api } from "./api";

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
      const trimmed = part.replace(/^\/+|\/+$/g, '');
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
      if (error instanceof Error && error.message.includes('401')) {
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
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
