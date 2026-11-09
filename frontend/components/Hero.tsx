"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Arrow, Family, Lock, Shield } from "./Icons";
import SearchCard from "./SearchCard";

const SLIDES = [
  "/images/slides/1-church.jpg",
  "/images/slides/2-hands.jpg",
  "/images/slides/3-rings.jpg",
  "/images/slides/4-walk.jpg",
  "/images/slides/5-vows.jpg",
];
const INTERVAL_MS = 2000; // change image every 2 seconds

export default function Hero() {
  const { t } = useI18n();
  const { loggedIn, hasProfile } = useAuth();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="home" className="hero">
      <div className="hero-slides" aria-hidden="true">
        {SLIDES.map((src, k) => (
          <div key={src} className={`hero-slide${k === i ? " on" : ""}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="hero-inner container">
        <div className="hero-copy">
          <div className="eyebrow">{t("hero.eyebrow")}</div>
          <h1>{(() => { const w = t("hero.title").split(" "); const last = w.pop(); return <>{w.join(" ")} <em>{last}</em></>; })()}</h1>
          <p>{t("hero.sub")}</p>
          <div className="hero-cta">
            {!loggedIn && <Link href="/register" className="btn btn-gold">{t("hero.cta1")} <Arrow /></Link>}
            {loggedIn && hasProfile === false && <Link href="/dashboard" className="btn btn-gold">Complete Your Profile <Arrow /></Link>}
            <Link href={loggedIn && hasProfile ? "/browse" : "/#matches"} className="btn btn-outline">{t("hero.cta2")}</Link>
          </div>
          <ul className="hero-badges">
            <li><Shield size={22} /> {t("hero.b1")}</li>
            <li><Lock size={22} /> {t("hero.b2")}</li>
            <li><Family size={22} /> {t("hero.b3")}</li>
          </ul>
        </div>
        <SearchCard />
      </div>
      <div className="hero-dots">
        {SLIDES.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} className={k === i ? "on" : ""} onClick={() => setI(k)} />)}
      </div>
    </section>
  );
}
