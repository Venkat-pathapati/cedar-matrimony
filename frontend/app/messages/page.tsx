"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import { Chevron, Msg, Send } from "@/components/Icons";
import { clientGet, clientPost, type ChatMessage, type Conversation, type Thread } from "@/lib/api";
import { logout } from "@/lib/auth";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
function when(iso: string | null, long = false) {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");   // the server sends UTC
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return long ? time : time;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return long ? `Yesterday, ${time}` : "Yesterday";
  const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
  return long ? `${date}, ${time}` : date;
}

function dayLabel(iso: string) {
  const d = new Date(iso + "Z"), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export default function MessagesPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const authFail = useCallback((e: unknown) => {
    if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); return true; }
    return false;
  }, [router]);

  const loadConvs = useCallback(() => clientGet<Conversation[]>("/api/messages/conversations").then(setConvs).catch((e) => {
    if (authFail(e)) return;
    setLoadErr(e instanceof Error ? e.message : "Could not load messages");
    setConvs([]);
  }), [authFail]);

  const loadThread = useCallback((id: number, quiet = false) => clientGet<Thread>(`/api/messages/with/${id}`).then((t) => {
    setThread(t);
    window.dispatchEvent(new Event("cedar-messages"));   // refresh the unread badge in the header
  }).catch((e) => {
    if (authFail(e)) return;
    if (!quiet) { setThread(null); setError(e instanceof Error ? e.message : "Could not open this chat"); }
  }), [authFail]);

  // start: sign-in check + open ?with=<id>
  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    const w = Number(new URLSearchParams(window.location.search).get("with"));
    if (w) setActive(w);
    loadConvs();
  }, [router, loadConvs]);

  useEffect(() => {
    if (active === null) { setThread(null); return; }
    setError(""); setThread(null); lastCount.current = 0;
    loadThread(active).then(() => loadConvs());   // refresh the list so the unread badge clears
    const t = setInterval(() => { if (!document.hidden) { loadThread(active, true); loadConvs(); } }, 8000);
    return () => clearInterval(t);
  }, [active, loadThread, loadConvs]);

  // scroll to the newest message when the thread grows
  useEffect(() => {
    if (thread && thread.messages.length !== lastCount.current) {
      lastCount.current = thread.messages.length;
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [thread]);

  function open(id: number) {
    setActive(id);
    window.history.replaceState(null, "", `/messages?with=${id}`);
  }
  function back() {
    setActive(null);
    window.history.replaceState(null, "", "/messages");
    loadConvs();
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || active === null || busy) return;
    setBusy(true); setError("");
    try {
      const m = await clientPost<ChatMessage>(`/api/messages/with/${active}`, { body }, true);
      setText("");
      setThread((t) => (t ? { ...t, messages: [...t.messages, m] } : t));
      loadConvs();
    } catch (x) {
      if (!authFail(x)) setError(x instanceof Error ? x.message : "Could not send");
    } finally { setBusy(false); }
  }

  const p = thread?.profile;
  return (
    <>
      <Header />
      <main className="mg">
        <div className={`mg-box${active !== null ? " open" : ""}`}>
          {/* ---------- conversation list ---------- */}
          <aside className="mg-list">
            <h1>Messages</h1>
            {convs === null && <p className="mg-empty">Loading…</p>}
            {loadErr && <p className="mg-empty">{loadErr}{loadErr.includes("profile first") && <> <Link href="/dashboard" className="link-arrow">Create profile</Link></>}</p>}
            {convs && convs.length === 0 && !loadErr && (
              <div className="mg-empty"><Msg size={34} /><p>No conversations yet.</p><Link href="/browse" className="link-arrow">Browse matches and say hello</Link></div>
            )}
            {convs?.map((c) => (
              <button type="button" key={c.profile.id} className={`mg-item${active === c.profile.id ? " on" : ""}`} onClick={() => open(c.profile.id)}>
                <Avatar p={c.profile} />
                <span className="mg-meta">
                  <span className="mg-top"><b>{c.profile.name}</b><small>{when(c.last_at)}</small></span>
                  <span className="mg-last">{c.last_message}</span>
                </span>
                {c.unread > 0 && <em className="mg-badge">{c.unread}</em>}
              </button>
            ))}
          </aside>

          {/* ---------- open chat ---------- */}
          <section className="mg-chat">
            {active === null && (
              <div className="mg-placeholder"><Msg size={44} /><h2>Your conversations</h2><p>Choose a conversation on the left, or open a profile and press “Send Message”.</p></div>
            )}
            {active !== null && !p && !error && <div className="mg-placeholder"><p>Loading…</p></div>}
            {active !== null && !p && error && (
              <div className="mg-placeholder"><p>{error}</p><button type="button" className="mg-link" onClick={back}>Back to messages</button></div>
            )}
            {p && thread && (
              <>
                <header className="mg-head">
                  <button type="button" className="mg-back" aria-label="Back to conversations" onClick={back}><Chevron dir="left" size={22} /></button>
                  <Avatar p={p} size={44} />
                  <div><b>{p.name}, {p.age}</b><small>{[p.city, p.profession].filter(Boolean).join(" · ")}</small></div>
                  <Link href={`/profile/${p.id}`} className="mg-viewp">View profile</Link>
                </header>
                <div className="mg-scroll">
                  {thread.messages.length === 0 && <p className="mg-hint">This is the start of your conversation with {p.name.split(" ")[0]}. Say hello and introduce yourself.</p>}
                  {thread.messages.map((m, i) => {
                    const prev = thread.messages[i - 1];
                    const newDay = !prev || !sameDay(new Date(prev.created_at + "Z"), new Date(m.created_at + "Z"));
                    return (
                      <div key={m.id}>
                        {newDay && <div className="mg-day">{dayLabel(m.created_at)}</div>}
                        <div className={`mg-row${m.mine ? " mine" : ""}`}>
                          <div className="mg-bubble">{m.body}<small>{new Date(m.created_at + "Z").toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                {thread.can_reply ? (
                  <form className="mg-compose" onSubmit={send}>
                    {error && <div className="mg-err">{error}{error.includes("paid plans") && <> <Link href="/#plans" className="link-arrow">View plans</Link></>}</div>}
                    <div className="mg-inputrow">
                      <textarea aria-label="Type a message" rows={1} maxLength={2000} placeholder="Type a message…" value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                      <button className="mg-send" disabled={busy || !text.trim()} aria-label="Send"><Send size={20} /></button>
                    </div>
                    <small className="mg-note">Be respectful. For your safety, do not share bank details or send money.</small>
                  </form>
                ) : (
                  <div className="mg-compose"><p className="mg-hint">You can no longer send messages to this member.</p></div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
