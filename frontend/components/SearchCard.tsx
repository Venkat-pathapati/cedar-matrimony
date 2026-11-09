"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Arrow, Chevron, Search } from "./Icons";

const ages = Array.from({ length: 33 }, (_, i) => 18 + i);
const cities = ["Hyderabad", "Bengaluru", "Chennai", "Vijayawada", "Visakhapatnam", "Mumbai", "Delhi"];
const denominations = ["Catholic", "CSI", "Baptist", "Pentecostal", "Orthodox", "Methodist", "Other"];

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="sel">
      <span>{label}</span>
      <div><select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{children}</select><Chevron size={14} /></div>
    </label>
  );
}

export default function SearchCard() {
  const router = useRouter();
  const { t } = useI18n();
  const { loggedIn, hasProfile } = useAuth();
  const [who, setWho] = useState("Bride");
  const [from, setFrom] = useState("24");
  const [to, setTo] = useState("30");
  const [loc, setLoc] = useState("");
  const [den, setDen] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ looking: who, from, to, ...(loc && { location: loc }), ...(den && { denomination: den }) });
    if (loggedIn && hasProfile) {
      const b = new URLSearchParams({ min_age: from, max_age: to, ...(loc && { city: loc }), ...(den && { denomination: den }) });
      router.push(`/browse?${b.toString()}`);
    } else router.push(`/?${q.toString()}#matches`);
  }

  return (
    <form className="search-card" onSubmit={go}>
      <h2>{t("search.title")}</h2>
      <Select label={t("search.looking")} value={who} onChange={setWho}><option value="Bride">{t("search.bride")}</option><option value="Groom">{t("search.groom")}</option></Select>
      <div className="sel-label">{t("search.age")}</div>
      <div className="age-row">
        <Select label={t("search.age")} value={from} onChange={setFrom}>{ages.map((a) => <option key={a}>{a}</option>)}</Select>
        <span>{t("search.to")}</span>
        <Select label={t("search.age")} value={to} onChange={setTo}>{ages.map((a) => <option key={a}>{a}</option>)}</Select>
      </div>
      <Select label={t("search.location")} value={loc} onChange={setLoc}><option value="">{t("search.selectLocation")}</option>{cities.map((c) => <option key={c}>{c}</option>)}</Select>
      <Select label={t("search.denomination")} value={den} onChange={setDen}><option value="">{t("search.selectDen")}</option>{denominations.map((d) => <option key={d}>{d}</option>)}</Select>
      <button className="btn btn-navy" type="submit"><Search size={18} /> {t("search.button")} <Arrow size={16} /></button>
    </form>
  );
}
