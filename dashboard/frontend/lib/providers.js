"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "./api";

const AuthCtx = createContext(null);

export function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const u = await api("/auth/me");
      setUser(u);
      return u;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (token) => {
    setToken(token);
    return refresh();
  };
  const logout = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch {}  // invalidates the token server-side too
    setToken(null);
    setUser(null);
    setUnread(0);
  };
  const refreshUnread = useCallback(async () => {
    try { setUnread((await api("/chat/unread-count")).unread); } catch {}
  }, []);
  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 20000);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh, unread, refreshUnread }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function useRequireAuth(adminOnly = false) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (adminOnly && user.role !== "admin") router.replace("/login");
  }, [user, loading, adminOnly, router]);
  return { user, loading };
}
