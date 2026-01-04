import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { UserProfile, TokenResponse, LoginInput, RegisterInput } from '@shared/schema';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<UserProfile>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeProfile = (profile: UserProfile): UserProfile => {
    const role = profile.role || profile.user_type || 'client';
    const roleDisplayMap: Record<string, string> = {
      'client': 'Client',
      'proprietaire': 'Propriétaire', 
      'commissionnaire': 'Commissionnaire',
      'agent': 'Agent'
    };
    return {
      ...profile,
      role: role as UserProfile['role'],
      role_display: profile.role_display || roleDisplayMap[role] || role,
    };
  };

  const fetchProfile = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await api.get<UserProfile>('/api/v1/auth/profile/');
      setUser(normalizeProfile(profile));
    } catch {
      api.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (credentials: LoginInput): Promise<UserProfile> => {
    const response = await api.post<TokenResponse>('/api/v1/auth/login/', credentials);
    api.setTokens(response.access, response.refresh);
    const profile = await api.get<UserProfile>('/api/v1/auth/profile/');
    const normalizedProfile = normalizeProfile(profile);
    setUser(normalizedProfile);
    return normalizedProfile;
  };

  const register = async (data: RegisterInput) => {
    await api.post('/api/v1/auth/register/', data);
    await login({ login: data.username, password: data.password });
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const updated = await api.patch<UserProfile>('/api/v1/auth/profile/', data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
