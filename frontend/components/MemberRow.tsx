"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { Briefcase, Cross, Pin } from "@/components/Icons";
import type { Profile } from "@/lib/api";

/** One member in a list (interests, shortlist): photo, key facts, status and action buttons. */
export default function MemberRow({ p, status, note, children }: { p: Profile; status?: ReactNode; note?: string; children?: ReactNode }) {
  return (
    <article className="mr">
      <Link href={`/profile/${p.id}`} className="mr-photo" aria-label={`View ${p.name}'s profile`}><Avatar p={p} size={104} square /></Link>
      <div className="mr-body">
        <div className="mr-top">
          <Link href={`/profile/${p.id}`} className="mr-name">{p.name}, {p.age}</Link>
          {p.match !== null && <span className="mr-match">{p.match}% Match</span>}
          {status}
        </div>
        <div className="mr-facts">
          {p.city && <span><Pin size={15} /> {[p.city, p.state].filter(Boolean).join(", ")}</span>}
          {p.profession && <span><Briefcase size={15} /> {p.profession}</span>}
          {p.denomination && <span><Cross size={15} /> {p.denomination}</span>}
        </div>
        {note && <div className="mr-note">{note}</div>}
        <div className="mr-actions">{children}</div>
      </div>
    </article>
  );
}
