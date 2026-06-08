"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface AuthUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  token: string; // access token
  refreshToken?: string; // optional refresh token
}

interface AuthContextType {
  user: AuthUser | null;
  // login now expects access token and full user data (including refresh token)
  login: (accessToken: string, userData: Omit<AuthUser, 'token'>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "crm_admin_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, userData: Omit<AuthUser, "token">) => {
    const authUser = { ...userData, token };
    setUser(authUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
