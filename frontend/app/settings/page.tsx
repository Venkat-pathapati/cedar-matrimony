"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PageDecor from "@/components/PageDecor";
import { clientGet, clientPost, type Me } from "@/lib/api";
import { logout } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    clientGet<Me>("/api/auth/me").then(setMe).catch((e) => {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); }
    });
  }, [router]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setOk("");
    if (next !== again) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      await clientPost("/api/auth/change-password", { current_password: cur, new_password: next }, true);
      setOk("Your password has been changed."); setCur(""); setNext(""); setAgain("");
    } catch (x) { setError(x instanceof Error ? x.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Header />
      <main className="st">
        <PageDecor few />
        <div className="st-wrap">
          <h1>Settings</h1>
          <p className="st-lead">Manage your account, password and language.</p>

          <section className="st-card">
            <h2>Account</h2>
            <dl>
              <div><dt>Email</dt><dd>{me?.email ?? "…"}</dd></div>
              <div><dt>Mobile</dt><dd>{me?.phone ? <>{me.phone} <em className={me.phone_verified ? "yes" : "no"}>{me.phone_verified ? "Verified" : "Not verified"}</em></> : "Not added"} · <Link href="/dashboard">Change in Edit Profile</Link></dd></div>
              <div><dt>Plan</dt><dd>{me?.plan ?? "…"} · <Link href="/#plans">View plans</Link></dd></div>
            </dl>
          </section>

          <section className="st-card">
            <h2>Change password</h2>
            <form onSubmit={changePassword}>
              <label htmlFor="s-cur">Current password</label>
              <input id="s-cur" type="password" required autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
              <label htmlFor="s-new">New password <small>(at least 8 characters)</small></label>
              <input id="s-new" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              <label htmlFor="s-again">Confirm new password</label>
              <input id="s-again" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
              {error && <div className="error">{error}</div>}
              {ok && <div className="ok">{ok}</div>}
              <button className="st-btn" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
            </form>
          </section>

          <section className="st-card">
            <h2>Language</h2>
            <p className="st-lead">Choose the language used across the website.</p>
            <LanguageSwitcher />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
