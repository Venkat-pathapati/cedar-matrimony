"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CompletenessBar from "@/components/CompletenessBar";
import PageDecor from "@/components/PageDecor";
import PhotoManager from "@/components/PhotoManager";
import { clientGet, clientPatch, clientPost, clientPut, type Me, type MyProfile } from "@/lib/api";
import { logout } from "@/lib/auth";

// Same sections and fields as the original profile form, one card per section, one Save button.
const DENOMS = ["Catholic", "Baptist", "CSI", "Pentecostal", "Methodist", "Lutheran", "Seventh-day Adventist", "Church of God", "Brethren", "Other"];
type Kind = "text" | "date" | "number" | string[];
type Field = [key: keyof MyProfile, label: string, kind?: Kind];

const SECTIONS: [string, Field[]][] = [
  ["Account", [["registering_for", "Registering for", ["Self", "Son", "Daughter", "Brother", "Sister", "Relative"]]]],
  ["Personal", [
    ["first_name", "First name"], ["last_name", "Last name"],
    ["gender", "Gender", ["male", "female"]], ["date_of_birth", "Date of birth", "date"],
    ["height_cm", "Height (cm)", "number"],
    ["marital_status", "Marital status", ["never_married", "divorced", "widowed", "awaiting_divorce", "annulled"]],
    ["physical_status", "Physical status", ["normal", "physically_challenged"]],
    ["mother_tongue", "Mother tongue"],
  ]],
  ["Faith", [
    ["denomination", "Denomination", DENOMS], ["church_name", "Church name"], ["church_location", "Church location"],
    ["baptism_status", "Baptism", ["baptized", "not_baptized"]],
    ["pastor_name", "Pastor / church reference name"],
    ["egf_member", "EGF member", ["yes", "no"]],
  ]],
  ["Location", [["country", "Country"], ["state", "State"], ["district", "District"], ["city", "City / town"]]],
  ["Education & work", [["education", "Education"], ["occupation", "Occupation"], ["organization", "Organization"], ["annual_income", "Annual income"]]],
  ["Family & lifestyle", [
    ["father_occupation", "Father's occupation"], ["mother_occupation", "Mother's occupation"], ["siblings", "Siblings", "number"],
    ["eating_habit", "Eating habit", ["vegetarian", "non_vegetarian", "eggetarian", "vegan"]],
    ["smoking_habit", "Smoking", ["no", "yes", "occasionally"]], ["drinking_habit", "Drinking", ["no", "yes", "occasionally"]],
    ["hobbies", "Hobbies (e.g. Reading, Traveling)"], ["fitness", "Fitness (e.g. Yoga, Gym)"],
    ["interests", "Interests (separate with commas)"],
  ]],
  ["Partner preferences", [
    ["pref_age_min", "Preferred age – from", "number"], ["pref_age_max", "Preferred age – to", "number"],
    ["pref_education", "Preferred education"], ["pref_location", "Preferred location"],
    ["pref_qualities", "Qualities you look for (e.g. Kind, Prayerful)"],
  ]],
];
const ALL: Field[] = [...SECTIONS.flatMap(([, f]) => f), ["egf_details", "EGF details"], ["testimony", "Testimony"]];
const NUMERIC = new Set<string>(["height_cm", "siblings", "pref_age_min", "pref_age_max"]);
const numMin = (k: string) => (k === "height_cm" ? 120 : k.startsWith("pref_age") ? 18 : 0);
const numMax = (k: string) => (k === "height_cm" ? 230 : k.startsWith("pref_age") ? 80 : 20);
const REQUIRED = new Set<string>(["first_name", "last_name", "gender", "date_of_birth"]);
const DEFAULTS: Record<string, string> = { registering_for: "Self", mother_tongue: "Telugu", country: "India", marital_status: "never_married", physical_status: "normal" };
const pretty = (o: string) => { const t = o.replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };
const eighteenYearsAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10); };

function Verification({ me, onMe }: { me: Me; onMe: (m: Me) => void }) {
  const [phone, setPhone] = useState(me.phone ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string; where: "phone" | "pw" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(where: "phone" | "pw", fn: () => Promise<string | void>) {
    setBusy(true); setMsg(null);
    try { const t = await fn(); if (t) setMsg({ kind: "ok", text: t, where }); }
    catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong", where }); }
    finally { setBusy(false); }
  }

  const savePhone = () => run("phone", async () => {
    await clientPut("/api/auth/phone", { phone: phone.replace(/[\s-]/g, "") });
    onMe(await clientGet<Me>("/api/auth/me")); setSent(false);
    return "Mobile number saved. Please verify it with an OTP.";
  });
  const sendOtp = () => run("phone", async () => { await clientPost("/api/auth/mobile-otp/send", undefined, true); setSent(true); return "OTP sent to your mobile number."; });
  const verifyOtp = () => run("phone", async () => {
    await clientPost("/api/auth/mobile-otp/verify", { code }, true);
    onMe(await clientGet<Me>("/api/auth/me")); setSent(false); setCode("");
    return "Mobile number verified.";
  });
  const changePw = (e: React.FormEvent) => { e.preventDefault(); run("pw", async () => {
    await clientPost("/api/auth/change-password", { current_password: pw.current, new_password: pw.next }, true);
    setPw({ current: "", next: "" }); setShowPw(false);
    return "Password changed.";
  }); };

  const note = (where: "phone" | "pw") => msg && msg.where === where && <div className={`${msg.kind} wide`}>{msg.text}</div>;
  const unchanged = phone.replace(/[\s-]/g, "") === (me.phone ?? "");

  return (
    <section className="dash-panel" id="verification">
      <div className="dash-panel-head"><h2>Verification</h2></div>

      <div className="dash-form">
        <label className="wide">Mobile number
          <div className="inline-row">
            <input type="tel" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="button" className="btn btn-outline btn-sm" disabled={busy || !phone || unchanged} onClick={savePhone}>Save</button>
          </div>
        </label>
        <div className="wide verify-row">
          {me.phone && (me.phone_verified
            ? <span className="badge ok-badge">✓ Mobile verified</span>
            : <><span className="badge warn-badge">Mobile not verified</span>
                {!sent && <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={sendOtp}>Send OTP</button>}</>)}
        </div>
        {sent && !me.phone_verified && (
          <div className="wide inline-row">
            <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit OTP" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" className="btn btn-navy btn-sm" disabled={busy || code.length !== 6} onClick={verifyOtp}>Verify</button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={sendOtp}>Resend</button>
          </div>
        )}
        {note("phone")}

        <div className="wide"><div className="dash-sub">Email</div>
          <div>{me.email} <span className="badge ok-badge">✓ Verified</span></div>
          <div className="hint">This is the email you log in with.</div>
        </div>

        <div className="wide"><div className="dash-sub">Password</div>
          {!showPw ? (
            <div className="inline-row"><span>••••••••</span><button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowPw(true); setMsg(null); }}>Change password</button></div>
          ) : (
            <form className="dash-form" onSubmit={changePw}>
              <label>Current password<input type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
              <label>New password (min 8 characters)<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
              <div className="wide dash-actions">
                <button className="btn btn-navy btn-sm" disabled={busy}>Update password</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPw(false)}>Cancel</button>
              </div>
            </form>
          )}
          {note("pw")}
        </div>
      </div>
    </section>
  );
}


export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [f, setF] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [saves, setSaves] = useState(0);

  const fill = (p: MyProfile | null) => {
    const v: Record<string, string> = { ...DEFAULTS };
    if (p) Object.entries(p).forEach(([k, x]) => { if (x !== null && x !== undefined && typeof x !== "boolean") v[k] = Array.isArray(x) ? x.join(", ") : String(x); });
    setF(v);
  };

  useEffect(() => {
    (async () => {
      try {
        const [m, p] = await Promise.all([clientGet<Me>("/api/auth/me"), clientGet<MyProfile | null>("/api/profiles/me")]);
        setMe(m); setProfile(p); fill(p);
      } catch (e) {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); return; }
        setErr("Could not load your details. Please try again.");
      } finally { setLoading(false); }
    })();
  }, [router]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      ALL.forEach(([k]) => {
        const v = (f[k] ?? "").trim();
        body[k] = v === "" ? null : NUMERIC.has(k) ? Number(v) : v;
      });
      body.interests = (f.interests ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
      body.about_me = (f.about_me ?? "").trim() || null;
      const firstTime = !profile;
      if (body.egf_member !== "yes") body.egf_details = null;
      const p = await clientPatch<MyProfile>("/api/profiles/me", body);
      setProfile(p); fill(p);
      if (firstTime) { router.push("/"); return; } // profile just created -> back to home
      setMe((m) => (m ? { ...m, has_profile: true } : m));
      setSaves((n) => n + 1);
      setOk(p.verified ? "Profile saved." : "Profile saved. It will be visible to others once an admin approves it.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (x) {
      if (x instanceof Error && x.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); return; }
      setErr(x instanceof Error ? x.message : "Could not save");
    } finally { setBusy(false); }
  }

  const status = !profile ? null : profile.verified ? "approved" : "pending";

  return (
    <>
      <Header />
      <main className="dash">
        <PageDecor />
        <section className="dash-hero">
          <div className="dash-hero-copy">
            <div className="dash-kicker">My Account</div>
            <h1>{profile ? <>My <em>Profile</em></> : <>Create Your <em>Profile</em></>}</h1>
            <p>{profile ? "Keep your details up to date so the right people can find you." : "Tell us about yourself and your faith — it only takes a few minutes. Add a photo to get more responses."}</p>
          </div>
        </section>
        <div className="dash-inner">
          {loading && <p className="lead">Loading…</p>}
          {!loading && !me && err && <div className="msg err">{err}</div>}
          {me && (
            <>
              <form onSubmit={submit}>
                <div className="row between" style={{ marginBottom: 16 }}>
                  <h2 className="dash-sub">Profile details</h2>
                  <div className="row">
                    <span className="muted">Plan: <b>{me.plan}</b>{me.plan === "Free" && <> · <Link href="/#plans" className="link-arrow">Upgrade</Link></>}</span>
                    {status && <span className={`badge ${status}`}>{status}</span>}
                  </div>
                </div>
                {err && <div className="msg err">{err}</div>}
                {ok && <div className="msg ok">{ok}</div>}

                {profile && <CompletenessBar refreshKey={saves} showLink={false} />}
                <PhotoManager />

                {SECTIONS.map(([title, fields]) => (
                  <div className="pcard" key={title}>
                    <h3>{title}</h3>
                    <div className="pgrid">
                      {fields.map(([k, label, kind]) => (
                        <div key={k}>
                          <label htmlFor={`f-${k}`}>{label}{REQUIRED.has(k) && " *"}</label>
                          {Array.isArray(kind) ? (
                            <select id={`f-${k}`} value={f[k] ?? ""} onChange={set(k)}>
                              <option value="">—</option>
                              {kind.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}
                            </select>
                          ) : (
                            <input id={`f-${k}`} type={kind ?? "text"} required={REQUIRED.has(k)} value={f[k] ?? ""} onChange={set(k)}
                              min={kind === "number" ? numMin(k) : undefined}
                              max={kind === "number" ? numMax(k) : kind === "date" ? eighteenYearsAgo() : undefined} />
                          )}
                        </div>
                      ))}
                      {title === "Faith" && f.egf_member === "yes" && (
                        <div>
                          <label htmlFor="f-egf_details">EGF</label>
                          <input id="f-egf_details" type="text" maxLength={200} placeholder="Write your EGF (fellowship / group name)" value={f.egf_details ?? ""} onChange={set("egf_details")} />
                        </div>
                      )}
                    </div>
                    {title === "Faith" && (
                      <div style={{ marginTop: 14 }}>
                        <label htmlFor="f-testimony">Testimony</label>
                        <textarea id="f-testimony" maxLength={3000} placeholder="Share your testimony — how you came to faith and what God has done in your life" value={f.testimony ?? ""} onChange={set("testimony")} />
                      </div>
                    )}
                  </div>
                ))}

                <div className="pcard">
                  <label htmlFor="f-about_me">About me</label>
                  <textarea id="f-about_me" value={f.about_me ?? ""} onChange={set("about_me")} maxLength={2000} />
                </div>
                <button className="btn btn-navy" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
              </form>

              <div style={{ marginTop: 28 }}><Verification me={me} onMe={setMe} /></div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
