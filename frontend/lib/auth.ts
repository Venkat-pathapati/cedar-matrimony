"use client";

import { useEffect, useState } from "react";

const KEY = "cedar_token";

export function saveToken(token: string) {
  try { localStorage.setItem(KEY, token); window.dispatchEvent(new Event("cedar-auth")); } catch {}
}

export function logout() {
  try { localStorage.removeItem(KEY); window.dispatchEvent(new Event("cedar-auth")); } catch {}
}

/** Logged-in state plus the account's basics (null = not known yet). */
export function useAuth(): { loggedIn: boolean | null; hasProfile: boolean | null; email: string | null; plan: string | null } {
  const loggedIn = useLoggedIn();
  const [info, setInfo] = useState<{ hasProfile: boolean | null; email: string | null; plan: string | null }>({ hasProfile: null, email: null, plan: null });
  useEffect(() => {
    if (!loggedIn) { setInfo({ hasProfile: loggedIn === false ? false : null, email: null, plan: null }); return; }
    let live = true;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const token = localStorage.getItem(KEY);
    fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (live && m) setInfo({ hasProfile: !!m.has_profile, email: m.email ?? null, plan: m.plan ?? null }); })
      .catch(() => {});
    return () => { live = false; };
  }, [loggedIn]);
  return { loggedIn, ...info };
}

/** true = logged in, false = logged out, null = not known yet (first render / server). */
export function useLoggedIn(): boolean | null {
  const [state, setState] = useState<boolean | null>(null);
  useEffect(() => {
    const read = () => { try { setState(!!localStorage.getItem(KEY)); } catch { setState(false); } };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("cedar-auth", read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("cedar-auth", read); };
  }, []);
  return state;
}
