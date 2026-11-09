"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { HeartIcon, Msg } from "@/components/Icons";
import MemberRow from "@/components/MemberRow";
import PageDecor from "@/components/PageDecor";
import { clientGet, clientPost, type InterestItem } from "@/lib/api";
import { logout } from "@/lib/auth";
import { refreshNotifications } from "@/lib/notify";

const day = (iso: string) => new Date(iso + "Z").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

export default function InterestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<InterestItem[] | null>(null);
  const [sent, setSent] = useState<InterestItem[] | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{ text: string; id?: number } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); return; }
    setError(e instanceof Error ? e.message : "Something went wrong");
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    if (new URLSearchParams(window.location.search).get("tab") === "sent") setTab("sent");
    clientGet<InterestItem[]>("/api/interests/received").then(setReceived).catch(fail);
    clientGet<InterestItem[]>("/api/interests/sent").then(setSent).catch(fail);
  }, [router, fail]);

  // opening "Sent" means the member has seen the good news
  useEffect(() => {
    if (tab === "sent" && sent?.some((i) => i.unseen)) {
      clientPost("/api/interests/seen", undefined, true).then(() => refreshNotifications()).catch(() => {});
    }
  }, [tab, sent]);

  function switchTab(t: "received" | "sent") {
    setTab(t); setFlash(null);
    window.history.replaceState(null, "", t === "sent" ? "/interests?tab=sent" : "/interests");
  }

  async function answer(i: InterestItem, what: "accept" | "decline") {
    setBusy(i.id); setFlash(null);
    try {
      await clientPost(`/api/interests/${i.id}/${what}`, undefined, true);
      setReceived((r) => r && r.map((x) => (x.id === i.id ? { ...x, status: what === "accept" ? "accepted" : "declined", unseen: false } : x)));
      setFlash(what === "accept" ? { text: `You accepted ${i.profile.name.split(" ")[0]}'s interest.`, id: i.profile.id } : { text: "Interest declined." });
      refreshNotifications();
    } catch (e) { fail(e); } finally { setBusy(null); }
  }

  const list = tab === "received" ? received : sent;
  const pending = received?.filter((i) => i.status === "pending").length ?? 0;
  const news = sent?.filter((i) => i.unseen).length ?? 0;
  const chip = (s: string, mine: boolean) => <span className={`mr-chip ${s}`}>{s === "pending" ? (mine ? "Waiting for reply" : "New") : s === "accepted" ? "Accepted" : "Declined"}</span>;

  return (
    <>
      <Header />
      <main className="act">
        <PageDecor few />
        <div className="act-wrap">
          <h1>Interests</h1>
          <p className="act-lead">See who is interested in you, and the interests you have sent.</p>
          <div className="act-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "received"} className={tab === "received" ? "on" : ""} onClick={() => switchTab("received")}>Received {pending > 0 && <em>{pending}</em>}</button>
            <button type="button" role="tab" aria-selected={tab === "sent"} className={tab === "sent" ? "on" : ""} onClick={() => switchTab("sent")}>Sent {news > 0 && <em>{news}</em>}</button>
          </div>
          {flash && <div className="act-flash">{flash.text} {flash.id && <Link href={`/messages?with=${flash.id}`} className="link-arrow">Send a message</Link>}</div>}
          {error && <div className="act-empty">{error}{error.includes("profile first") && <> <Link href="/dashboard" className="link-arrow">Create profile</Link></>}</div>}
          {!error && list === null && <div className="act-empty">Loading…</div>}
          {!error && list && list.length === 0 && (
            <div className="act-empty"><HeartIcon size={34} />
              {tab === "received" ? <p>No interests received yet. A complete profile with a photo gets noticed more.</p> : <p>You have not sent any interests yet.</p>}
              <Link href={tab === "received" ? "/dashboard" : "/browse"} className="link-arrow">{tab === "received" ? "Improve your profile" : "Browse matches"}</Link>
            </div>
          )}
          {list?.map((i) => (
            <MemberRow key={i.id} p={i.profile} status={chip(i.status, tab === "sent")} note={`${tab === "received" ? "Received" : "Sent"} on ${day(i.created_at)}`}>
              {tab === "received" && i.status === "pending" && (
                <>
                  <button type="button" className="mr-btn gold" disabled={busy === i.id} onClick={() => answer(i, "accept")}>Accept</button>
                  <button type="button" className="mr-btn" disabled={busy === i.id} onClick={() => answer(i, "decline")}>Decline</button>
                </>
              )}
              {i.status === "accepted" && <Link href={`/messages?with=${i.profile.id}`} className="mr-btn gold"><Msg size={17} /> Send message</Link>}
              <Link href={`/profile/${i.profile.id}`} className="mr-btn">View profile</Link>
            </MemberRow>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
