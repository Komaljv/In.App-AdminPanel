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
  canShareDocuments?: boolean;
  company?: {
    id: string;
    name: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  login: (accessToken: string, userData: Omit<AuthUser, "token">) => void;
  logout: () => void;
  impersonate: (userToken: string, userData: Omit<AuthUser, "token">) => void;
  exitImpersonation: () => void;
  isImpersonating: boolean;
  impersonatorAdmin: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "crm_admin_auth";
const BACKUP_AUTH_KEY = "crm_impersonator_backup";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [impersonatorAdmin, setImpersonatorAdmin] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored) setUser(JSON.parse(stored));

        const backupStored = localStorage.getItem(BACKUP_AUTH_KEY);
        if (backupStored) {
          setImpersonatorAdmin(JSON.parse(backupStored));
        } else {
          setImpersonatorAdmin(null);
        }
      } catch {}
    };

    loadUser();
    setIsLoading(false);

    window.addEventListener("auth-token-refreshed", loadUser);
    return () => window.removeEventListener("auth-token-refreshed", loadUser);
  }, []);

  const login = useCallback((token: string, userData: Omit<AuthUser, "token">) => {
    const authUser = { ...userData, token };
    setUser(authUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  }, []);

  const impersonate = useCallback(
    (userToken: string, userData: Omit<AuthUser, "token">) => {
      if (user && !impersonatorAdmin) {
        localStorage.setItem(BACKUP_AUTH_KEY, JSON.stringify(user));
        setImpersonatorAdmin(user);
      }
      const authUser = { ...userData, token: userToken };
      setUser(authUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    },
    [user, impersonatorAdmin]
  );

  const exitImpersonation = useCallback(() => {
    try {
      const backupStored = localStorage.getItem(BACKUP_AUTH_KEY);
      if (backupStored) {
        const adminUser = JSON.parse(backupStored);
        setUser(adminUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(adminUser));
      }
    } catch (e) {
      console.error("Failed to restore admin session:", e);
    } finally {
      localStorage.removeItem(BACKUP_AUTH_KEY);
      setImpersonatorAdmin(null);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setImpersonatorAdmin(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(BACKUP_AUTH_KEY);
  }, []);

  const isImpersonating = Boolean(impersonatorAdmin);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        impersonate,
        exitImpersonation,
        isImpersonating,
        impersonatorAdmin,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
