"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientGet, type Completeness } from "@/lib/api";

/** "Your profile is 70% complete" with the next things to add. Pass `refreshKey` to reload after saving. */
export default function CompletenessBar({ refreshKey = 0, showLink = true }: { refreshKey?: number; showLink?: boolean }) {
  const [c, setC] = useState<Completeness | null>(null);
  useEffect(() => { clientGet<Completeness>("/api/profiles/me/completeness").then(setC).catch(() => {}); }, [refreshKey]);
  if (!c) return null;
  const done = c.percent >= 100;
  return (
    <div className={`cb${done ? " done" : ""}`}>
      <div className="cb-top">
        <b>{done ? "Your profile is complete" : `Your profile is ${c.percent}% complete`}</b>
        {!done && showLink && <Link href="/dashboard" className="link-arrow">Complete now</Link>}
      </div>
      <div className="cb-track" role="progressbar" aria-valuenow={c.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${c.percent}%` }} /></div>
      {!done && <div className="cb-tips">{c.missing.slice(0, 4).map((m) => <span key={m}>+ {m}</span>)}{c.missing.length > 4 && <span>+{c.missing.length - 4} more</span>}</div>}
      {done && <small>Complete profiles get noticed more. Well done!</small>}
    </div>
  );
}
