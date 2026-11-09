"use client";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/translations";
import { Chevron, Globe } from "./Icons";

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <label className={`lang${dark ? " lang-dark" : ""}`}>
      <Globe />
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
      <Chevron size={14} />
    </label>
  );
}
