"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { clientPost, type Profile } from "@/lib/api";
import { Briefcase, Cap, Cross, HeartIcon, Pin } from "./Icons";

export default function ProfileCard({ p, detailed = false }: { p: Profile; detailed?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  function view() {
    // Full profile pages are member-only.
    if (!localStorage.getItem("cedar_token")) router.push("/login");
    else router.push(`/profile/${p.id}`);
  }

  async function act(kind: "interest" | "shortlist") {
    setBusy(true);
    setMsg("");
    try {
      const r = await clientPost<{ message: string }>(`/api/profiles/${p.id}/${kind}`, undefined, true);
      setMsg(r.message);
      if (kind === "shortlist") setSaved(true);
    } catch (e) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") router.push("/login");
      else setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pcard">
      <div className="pphoto" style={p.photo_url ? { backgroundImage: `url(${p.photo_url})` } : undefined}>
        {!p.photo_url && p.name.charAt(0)}
        {p.verified && <span className="vbadge">✓ Verified</span>}
        {p.match !== null && <span className="mbadge">{p.match}% Match</span>}
        <button className={`heart${saved ? " on" : ""}`} aria-label="Shortlist" disabled={busy} onClick={() => act("shortlist")}><HeartIcon size={18} filled={saved} /></button>
      </div>
      <div className="pbody">
        <h3>{p.name}, {p.age}</h3>
        {detailed ? (
          <>
            <div className="pline"><Pin /> {[p.city, p.state].filter(Boolean).join(", ")}</div>
            {p.education && <div className="pline"><Cap /> {p.education}</div>}
            <div className="pline"><Briefcase /> {p.profession}</div>
            <div className="pline"><Cross size={14} /> {p.denomination}</div>
          </>
        ) : (
          <>
            <div className="pline"><Pin /> {p.city}</div>
            <div className="pline">{p.profession}{p.education ? <> <i>·</i> {p.education}</> : null}</div>
            <div className="pline">{p.denomination}</div>
          </>
        )}
        <div className="pactions">
          <button className="btn btn-navy btn-sm" onClick={view}>{t("card.view")}</button>
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("shortlist")}><HeartIcon size={14} /> {t("card.shortlist")}</button>
        </div>
        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}
