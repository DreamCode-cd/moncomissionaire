import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthTokens, UserProfile } from "@shared/schema";
import { AUTH_TOKEN_KEY, USER_KEY, API_BASE_URL } from "@shared/schema";

interface AuthContextValue {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens, user: UserProfile) => void;
  logout: () => void;
  updateUser: (user: UserProfile) => void;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedTokens = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedTokens && storedUser) {
      try {
        setTokens(JSON.parse(storedTokens));
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newTokens: AuthTokens, newUser: UserProfile) => {
    setTokens(newTokens);
    setUser(newUser);
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(newTokens));
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    if (tokens?.refresh) {
      fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({ refresh: tokens.refresh }),
      }).catch(() => {});
    }

    setTokens(null);
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateUser = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!tokens?.refresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const data = await response.json();
      const newTokens: AuthTokens = {
        access: data.access,
        refresh: tokens.refresh,
      };
      
      setTokens(newTokens);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(newTokens));
      return data.access;
    } catch {
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!tokens && !!user,
        isLoading,
        login,
        logout,
        updateUser,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
