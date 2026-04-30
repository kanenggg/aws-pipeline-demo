"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../utils/apiClient"; // Ensure this points to your new Axios instance

interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // changed state to string | null to match interface cleanly
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  const login = async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken); // Set immediately for the subsequent request

    try {
      // Axios call
      const res = await apiClient.get("/users/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Login fetch error:", err);
      // If fetching the user fails (e.g. token invalid), logout immediately
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("edit_fix_filters");
    router.replace("/");
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        setInitialized(true);
        return;
      }

      const payload = parseJwt(storedToken);
      // Check if token is expired
      if (!payload || payload.exp * 1000 < Date.now()) {
        logout();
        setInitialized(true);
        return;
      }

      // Token exists and is valid (time-wise)
      setToken(storedToken);

      try {
        const res = await apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error("Auth init error:", err);
        logout();
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isLoggedIn: !!token, initialized }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
