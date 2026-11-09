"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Arrow } from "./Icons";

export default function CtaBand() {
  const { t } = useI18n();
  const { loggedIn, hasProfile } = useAuth();
  if (loggedIn && hasProfile !== false) return null;
  return (
    <section className="cta">
      <div className="container cta-inner">
        <div>
          <h2>{t("cta.title")}</h2>
          <p>{t("cta.sub")}</p>
        </div>
        <Link href={loggedIn ? "/dashboard" : "/register"} className="btn btn-gold">{loggedIn ? "Complete Your Profile" : t("cta.button")} <Arrow /></Link>
      </div>
    </section>
  );
}
