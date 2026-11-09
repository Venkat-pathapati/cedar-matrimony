"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DICTS, LANGS, type Key, type Lang } from "./translations";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; tx: (prefix: string, raw: string) => string };
const I18n = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => DICTS.en[k], tx: (_p, raw) => raw });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cedar_lang") as Lang | null;
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("cedar_lang", l); } catch {}
  }, []);

  const t = useCallback((k: Key) => DICTS[lang][k] ?? DICTS.en[k], [lang]);
  /** Translate data coming from the API (plan names, features…); falls back to the original text. */
  const tx = useCallback((prefix: string, raw: string) => (DICTS[lang] as Record<string, string>)[`${prefix}.${raw}`] ?? raw, [lang]);

  return <I18n.Provider value={{ lang, setLang, t, tx }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
