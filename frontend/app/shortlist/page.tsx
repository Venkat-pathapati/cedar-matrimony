"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Msg, Star } from "@/components/Icons";
import MemberRow from "@/components/MemberRow";
import PageDecor from "@/components/PageDecor";
import { clientDelete, clientGet, type Profile } from "@/lib/api";
import { logout } from "@/lib/auth";

export default function ShortlistPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    clientGet<Profile[]>("/api/shortlist").then(setRows).catch((e) => {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Something went wrong");
    });
  }, [router]);

  async function remove(id: number) {
    setRows((r) => r && r.filter((p) => p.id !== id));
    try { await clientDelete(`/api/profiles/${id}/shortlist`); } catch { /* the list reloads next visit */ }
  }

  return (
    <>
      <Header />
      <main className="act">
        <PageDecor few />
        <div className="act-wrap">
          <h1>Shortlisted</h1>
          <p className="act-lead">Profiles you saved to look at again.</p>
          {error && <div className="act-empty">{error}{error.includes("profile first") && <> <Link href="/dashboard" className="link-arrow">Create profile</Link></>}</div>}
          {!error && rows === null && <div className="act-empty">Loading…</div>}
          {!error && rows && rows.length === 0 && (
            <div className="act-empty"><Star size={34} /><p>Nobody shortlisted yet. Tap the heart on a profile to save it here.</p><Link href="/browse" className="link-arrow">Browse matches</Link></div>
          )}
          {rows?.map((p) => (
            <MemberRow key={p.id} p={p}>
              <Link href={`/profile/${p.id}`} className="mr-btn gold">View profile</Link>
              <Link href={`/messages?with=${p.id}`} className="mr-btn"><Msg size={17} /> Message</Link>
              <button type="button" className="mr-btn" onClick={() => remove(p.id)}>Remove</button>
            </MemberRow>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
