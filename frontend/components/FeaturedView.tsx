"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/api";
import { Arrow } from "./Icons";
import ProfileCard from "./ProfileCard";

export default function FeaturedView({ profiles }: { profiles: Profile[] }) {
  const { t } = useI18n();
  const { loggedIn, hasProfile } = useAuth();
  return (
    <section id="matches" className="section featured">
      <div className="container">
        <div className="sec-head">
          <div className="sec-title">
            <div className="kicker">{t("feat.kicker")}</div>
            <h2>{t("feat.title")}</h2>
            <p className="lead">{t("feat.sub")}</p>
          </div>
          <Link href={!loggedIn ? "/register" : hasProfile === false ? "/dashboard" : "/browse"} className="link-arrow">{t("feat.viewAll")} <Arrow size={14} /></Link>
        </div>
        <div className="grid cards4">
          {profiles.map((p) => <ProfileCard key={p.id} p={p} />)}
        </div>
      </div>
    </section>
  );
}
