"use client";

import Link from "next/link";
import { useLoggedIn } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Plan } from "@/lib/api";
import { Check, Crown, Gem, HeartIcon, XMark } from "./Icons";

const TAGLINES: Record<string, string> = {
  Free: "Explore and find your matches",
  Silver: "Connect with more possibilities",
  Gold: "Be seen. Be connected. Faster.",
  Platinum: "Premium experience for serious matches",
};
const ICONS: Record<string, { cls: string; icon: React.ReactNode }> = {
  Free: { cls: "free", icon: <HeartIcon size={30} filled /> },
  Silver: { cls: "silver", icon: <Crown /> },
  Gold: { cls: "gold", icon: <Crown /> },
  Platinum: { cls: "plat", icon: <Gem /> },
};
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function PlansView({ plans }: { plans: Plan[] }) {
  const { t, tx, lang } = useI18n();
  const loggedIn = useLoggedIn();
  return (
    <section id="plans" className="section plans">
      <div className="container plans-grid">
        <div className="plans-intro">
          <div className="kicker">{t("plans.kicker")}</div>
          <h2>{t("plans.title")}</h2>
          <p className="lead">{t("plans.sub")}</p>
          <p className="note">{t("plans.note")}</p>
        </div>
        <div className="plan-cards">
          {plans.map((pl) => {
            const months = parseInt(pl.period, 10);                 // "3 Months" -> 3, "Lifetime" -> NaN
            const perMonth = months > 0 && pl.price > 0 ? Math.round(pl.price / months) : null;
            const sub = tx("plan", `${pl.name}.sub`);
            const ic = ICONS[pl.name] ?? ICONS.Free;
            const name = `${tx("plan", pl.name)}${lang === "en" ? " Plan" : ""}`;
            return (
              <div key={pl.name} className={`plan${pl.highlight ? " hl" : ""}`}>
                {pl.highlight && <div className="tag"><Crown size={14} /> {t("plans.popular")}</div>}
                <div className="plan-top">
                  <span className={`plan-ic ${ic.cls}`}>{ic.icon}</span>
                  <div className="plan-head">
                    <h3>{name}</h3>
                    <div className="plan-sub">{sub === `${pl.name}.sub` ? TAGLINES[pl.name] ?? "" : sub}</div>
                  </div>
                </div>
                <div className="price">{rupees(pl.price)} <small>/ {pl.period.toLowerCase() === "lifetime" ? t("plans.lifetime") : pl.period}</small></div>
                <div className="per">{perMonth ? `Just ${rupees(perMonth)} per month` : "\u00A0"}</div>
                <ul>
                  {pl.features.map((f) => <li key={f}><span className="pi ok"><Check size={11} /></span> {tx("pf", f)}</li>)}
                  {(pl.excluded ?? []).map((f) => <li key={f} className="off"><span className="pi no"><XMark size={10} /></span> {tx("pf", f)}</li>)}
                </ul>
                <Link href={loggedIn ? "/dashboard" : "/register"} className={`btn plan-btn ${pl.highlight ? "btn-gold" : pl.name === "Platinum" ? "btn-navy" : "btn-outline"}`}>
                  {pl.price === 0 ? t("plans.start") : `${t("plans.choose")} ${tx("plan", pl.name)}`}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
