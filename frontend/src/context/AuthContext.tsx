import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest, getAuthToken, setAuthToken, removeAuthToken, getStoredUser, setStoredUser } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (username: string, password: string) => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await apiRequest<User>('/auth/me');
        setUser(currentUser);
        setStoredUser(currentUser);
      } catch (err) {
        removeAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verifyAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const data = await apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    });

    setAuthToken(data.access_token);
    setStoredUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore errors on logout
    } finally {
      removeAuthToken();
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const switchUser = async (username: string, password: string) => {
    await login(username, password);
  };

  const hasRole = (roleCodes: string[]): boolean => {
    if (!user || !user.roles) return false;
    const userRoleCodes = user.roles.map((r) => r.code);
    if (userRoleCodes.includes('ROLE_ADMIN')) return true;
    return roleCodes.some((code) => userRoleCodes.includes(code));
  };

  const isAdmin = user?.roles?.some((r) => r.code === 'ROLE_ADMIN') || false;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchUser, hasRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
