import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  const raw = localStorage.getItem("asterix_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(localStorage.getItem("asterix_token"));
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      async login(username: string, password: string) {
        setIsLoading(true);
        try {
          const result = await authApi.login(username, password);
          localStorage.setItem("asterix_token", result.token);
          localStorage.setItem("asterix_user", JSON.stringify(result.user));
          setToken(result.token);
          setUser(result.user);
        } finally {
          setIsLoading(false);
        }
      },
      logout() {
        localStorage.removeItem("asterix_token");
        localStorage.removeItem("asterix_user");
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
