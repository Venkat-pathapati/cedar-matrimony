"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";
import Brand from "@/components/Brand";
import Icon from "@/components/Icon";

const TRUST = [["shield", "Verified", "Profiles"], ["heart", "Trusted", "Community"], ["lock", "Safe &", "Secure"], ["users", "Better Matches", "Faster"]];
const safe = (fn) => { try { return fn(); } catch { return null; } };

export default function Login() {
  const router = useRouter();
  const { user, login, logout } = useAuth();
  const [f, setF] = useState({ username: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user?.role === "admin") router.replace("/admin"); }, [user, router]);
  useEffect(() => { const u = safe(() => localStorage.getItem("admin_email")); if (u) setF((x) => ({ ...x, username: u })); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await api("/auth/login", { method: "POST", body: f });
      const u = await login(r.access_token);
      if (u?.role !== "admin") { await logout(); throw new Error("This login is for administrators only."); }
      safe(() => (remember ? localStorage.setItem("admin_email", f.username) : localStorage.removeItem("admin_email")));
      router.push("/admin");
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="login-page">
      <div className="login-stage">
      <section className="login-hero">
        <Brand size="lg" />
        <p className="login-tag">Where Hearts Find <em>Their Forever</em></p>
        <div className="login-rule"><span>✝</span></div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit}>
          <span className="login-eyebrow"><Icon name="shield" size={16} /> Admin Console</span>
          <h1>Admin Login dashboard </h1>
          <p className="muted">Login to manage members, profiles and matches</p>
          <div className="login-divider"><span>✝</span></div>
          {err && <div className="msg err" role="alert">{err}</div>}

          <label htmlFor="user" className="sr">Email address or mobile number</label>
          <div className="field"><Icon name="mail" size={20} /><input id="user" autoComplete="username" placeholder="Email Address / Mobile Number" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></div>

          <label htmlFor="pw" className="sr">Password</label>
          <div className="field">
            <Icon name="lock" size={20} />
            <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}><Icon name="eye" size={20} /></button>
          </div>

          <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
          <button className="login-btn" disabled={busy}>{busy ? "Signing in…" : "Login →"}</button>
          <p className="login-secure"><Icon name="lock" size={14} /> Secure, encrypted sign-in · Authorized admins only</p>
        </form>

        <ul className="trust">
          {TRUST.map(([i, a, b]) => <li key={a}><Icon name={i} size={26} /><span>{a}<br />{b}</span></li>)}
        </ul>
      </section>
      </div>
    </div>
  );
}