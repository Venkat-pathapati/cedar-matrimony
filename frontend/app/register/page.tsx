"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import { Arrow, Check, Cross, Eye, Family, Lock, Mail, Phone, Shield, User } from "@/components/Icons";
import { clientPost } from "@/lib/api";
import { saveToken } from "@/lib/auth";

const STEPS = ["Create Account", "Verify Email", "Complete Profile"];
const BADGES = [
  { Icon: Shield, t: "Verified Profiles", d: "Real & Genuine" },
  { Icon: Lock, t: "Secure & Private", d: "Your Data is Safe" },
  { Icon: Family, t: "Family Friendly", d: "Trusted by Families" },
  { Icon: Cross, t: "Faith Centered", d: "Christian Values" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(""); setInfo("");
    try { await fn(); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }
  const register = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await clientPost("/api/auth/register", { email, phone: phone || null, password });
      setStep("otp");
    });
  };
  const resend = () => run(async () => {
    await clientPost("/api/auth/resend-otp", { email });
    setInfo("A new code has been sent to your email.");
  });
  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await clientPost<{ access_token: string }>("/api/auth/verify-otp", { email, code });
      saveToken(r.access_token);
      router.push("/dashboard");
    });
  };

  const active = step === "details" ? 0 : 1;
  return (
    <>
    <Header />
    <section className="reg">
        <div className="reg-left">
          <img className="reg-photo" src="/images/reg-couple.jpg" alt="" />
          <div className="reg-copy">
            <div className="reg-eyebrow">Telugu Christian Matrimony</div>
            <h1>Faith Brings Two Hearts <em>Together</em></h1>
            <p>Cedar Matrimony is a trusted platform for Telugu Christian brides and grooms to find a life partner who shares your faith, values and dreams.</p>
          </div>
          <div className="reg-badges">
            {BADGES.map(({ Icon, t, d }) => (
              <div key={t}><span><Icon size={26} /></span><b>{t}</b><small>{d}</small></div>
            ))}
          </div>
          <div className="reg-script">Real People. Real Connections.</div>
        </div>

      <div className="reg-card">
        <div className="reg-kicker"><Cross size={16} /> Join Cedar Matrimony</div>
        <h2>{step === "details" ? <>Create Your <em>Account</em></> : <>Verify Your <em>Email</em></>}</h2>
        <p className="reg-sub">{step === "details"
          ? "Take the first step towards a meaningful relationship with a fellow Christian."
          : `We sent a 6-digit verification code to ${email}. Check your inbox (and spam folder).`}</p>

        <ol className="reg-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === active ? "on" : i < active ? "done" : ""}>
              <span>{i < active ? <Check size={14} /> : i + 1}</span>{s}
            </li>
          ))}
        </ol>

        {step === "details" ? (
          <form onSubmit={register}>
            <div className="reg-group">
              <div className="reg-gtitle"><User size={20} /> Account Details</div>
              <label className="reg-label" htmlFor="r-email">Email Address <i>*</i></label>
              <div className="reg-input"><Mail /><input id="r-email" type="email" required placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <label className="reg-label" htmlFor="r-phone">Mobile Number <small>(Optional)</small></label>
              <div className="reg-input"><Phone /><input id="r-phone" type="tel" placeholder="Enter your mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <label className="reg-label" htmlFor="r-pw">Password <i>*</i></label>
              <div className="reg-input">
                <Lock size={20} />
                <input id="r-pw" type={showPw ? "text" : "password"} required minLength={8} maxLength={72} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="reg-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)}><Eye size={20} /></button>
              </div>
              <div className="reg-hint">Minimum 8 characters</div>
            </div>
            {error && <div className="error">{error}</div>}
            <button className="reg-submit" disabled={busy}>{busy ? "Please wait…" : <>Create My Account <Arrow size={18} /></>}</button>
            <div className="reg-foot">Already have an account? <Link href="/login">Login Here</Link></div>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="reg-group">
              <label className="reg-label" htmlFor="r-code">Verification code <i>*</i></label>
              <div className="reg-input"><Lock size={20} /><input id="r-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            </div>
            {error && <div className="error">{error}</div>}
            {info && <div className="ok">{info}</div>}
            <button className="reg-submit" disabled={busy}>{busy ? "Verifying…" : <>Verify & Continue <Arrow size={18} /></>}</button>
            <div className="reg-foot"><button type="button" className="reg-link" disabled={busy} onClick={resend}>Resend code</button></div>
          </form>
        )}
      </div>

    </section>
    </>
  );
}
