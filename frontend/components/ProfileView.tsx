"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Arrow, Briefcase, Calendar, Camera, Cap, Cross, Dots, Family, Flag, FaithLeaf, HeartIcon, HomeIcon, Msg, Pencil, Pin, Ruler, Shield, User } from "@/components/Icons";
import CompletenessBar from "@/components/CompletenessBar";
import PageDecor from "@/components/PageDecor";
import { clientDelete, clientGet, clientPost, fetchPhotoUrl, type ProfileDetail } from "@/lib/api";
import { logout } from "@/lib/auth";
import { refreshNotifications } from "@/lib/notify";

const pretty = (v: string | null | undefined) => (v ? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()).replace(/ (\w)/g, (_, c) => " " + c.toUpperCase()) : "");
const feet = (cm: number) => { const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}′${inch % 12}″ (${cm} cm)`; };
const code = (id: number) => `CED${String(id).padStart(6, "0")}`;

type Row = [string, string | null | undefined];
const present = (rows: Row[]) => rows.filter(([, v]) => v && String(v).trim());

export default function ProfileView({ id }: { id?: number }) {
  const router = useRouter();
  const [d, setD] = useState<ProfileDetail | null>(null);
  const [err, setErr] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [active, setActive] = useState("overview");
  const moreRef = useRef<HTMLDivElement>(null);

  // load the profile (own profile when no id is given)
  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    let live = true;
    (async () => {
      try {
        let pid = id;
        if (pid === undefined) {
          const me = await clientGet<{ id: number } | null>("/api/profiles/me");
          if (!me) { router.replace("/dashboard"); return; }
          pid = me.id;
        }
        const data = await clientGet<ProfileDetail>(`/api/profiles/${pid}`);
        if (live) setD(data);
      } catch (e) {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); }
        else if (live) setErr(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => { live = false; };
  }, [id, router]);

  // photos: uploaded ones need the login token, so fetch them as blobs
  useEffect(() => {
    if (!d) return;
    let live = true;
    (async () => {
      const got: string[] = [];
      for (const pid of d.photo_ids) { try { got.push(await fetchPhotoUrl(pid)); } catch {} }
      got.push(...(d.gallery_urls ?? []));   // ready-made photos (demo members)
      if (!got.length && d.photo_url) got.push(d.photo_url);
      if (live) { setUrls(got); setSel(0); }
    })();
    return () => { live = false; };
  }, [d]);

  useEffect(() => {
    if (!more) return;
    const f = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [more]);

  const sections = useMemo(() => {
    if (!d) return [];
    const she = d.gender === "female";
    const location = [d.city, d.state].filter(Boolean).join(", ");
    return [
      { id: "about", label: d.is_me ? "About Me" : she ? "About Her" : "About Him", Icon: User, show: !!d.about },
      { id: "personal", label: "Personal Details", Icon: Calendar, show: true },
      { id: "faith", label: "Faith & Beliefs", Icon: Cross, show: !!(d.church_name || d.baptism_status || d.egf_member || d.testimony) },
      { id: "career", label: "Education & Career", Icon: Cap, show: !!(d.education || d.profession) },
      { id: "lifestyle", label: "Lifestyle", Icon: HeartIcon, show: !!(d.eating_habit || d.smoking_habit || d.drinking_habit || d.hobbies || d.fitness) },
      { id: "family", label: "Family Details", Icon: Family, show: !!(d.father_occupation || d.mother_occupation || d.siblings !== null) },
      { id: "interests", label: "Interests", Icon: HeartIcon, show: !!d.interests?.length },
      { id: "prefs", label: "Partner Preferences", Icon: HeartIcon, show: !!(d.pref_age_min || d.pref_age_max || d.pref_education || d.pref_location || d.pref_qualities) },
      { id: "gallery", label: "Photo Gallery", Icon: Camera, show: urls.length > 0 || d.is_me },
      { id: "_loc", label: location, Icon: Pin, show: false },
    ].filter((s) => s.show);
  }, [d, urls]);

  // highlight the section being read
  useEffect(() => {
    if (!sections.length) return;
    const io = new IntersectionObserver((es) => {
      const hit = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id.replace("sec-", ""));
    }, { rootMargin: "-120px 0px -60% 0px" });
    sections.forEach((s) => { const el = document.getElementById(`sec-${s.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);

  async function act(kind: "interest" | "shortlist") {
    if (!d) return;
    setBusy(true); setMsg("");
    try {
      const r = await clientPost<{ message: string }>(`/api/profiles/${d.id}/${kind}`, undefined, true);
      setMsg(r.message);
      setD({ ...d, ...(kind === "interest" ? { interest_sent: true, interest_status: "pending" } : { shortlisted: true }) });
    } catch (e) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") router.push("/login");
      else if (e instanceof Error && e.message === "Interest already sent") setD({ ...d, interest_sent: true });
      else setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  // tapping a shortlisted heart again removes it
  async function toggleShortlist() {
    if (!d) return;
    if (!d.shortlisted) return act("shortlist");
    setBusy(true); setMsg("");
    try { await clientDelete(`/api/profiles/${d.id}/shortlist`); setD({ ...d, shortlisted: false }); setMsg("Removed from your shortlist."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  // they sent me an interest: accept or decline it right here
  async function answerTheirs(what: "accept" | "decline") {
    if (!d || d.their_interest_id === null) return;
    setBusy(true); setMsg("");
    try {
      await clientPost(`/api/interests/${d.their_interest_id}/${what}`, undefined, true);
      setD({ ...d, they_interested: what === "accept" ? "accepted" : "declined" });
      setMsg(what === "accept" ? `You accepted ${d.name.split(" ")[0]}'s interest. You can now send a message.` : "Interest declined.");
      refreshNotifications();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (err) return (<><Header /><main className="pv"><div className="pv-state">{err.includes("profile first") ? <>Create your profile first to view other members. <Link href="/dashboard" className="link-arrow">Create profile</Link></> : <>{err} <Link href="/browse" className="link-arrow">Back to matches</Link></>}</div></main><Footer /></>);
  if (!d) return (<><Header /><main className="pv"><div className="pv-state">Loading profile…</div></main><Footer /></>);

  const she = d.gender === "female";
  const location = [d.city, d.state].filter(Boolean).join(", ");
  const quote = d.about ? (d.about.length > 190 ? d.about.slice(0, 190).replace(/\s+\S*$/, "") + "…" : d.about) : "";
  const keyRows = present([
    ["Age", `${d.age} Years`], ["Height", d.height_cm ? feet(d.height_cm) : null], ["Marital Status", pretty(d.marital_status)],
    ["Denomination", d.denomination], ["Mother Tongue", d.mother_tongue], ["Location", [location, d.country].filter(Boolean).join(", ")],
    ["Physical Status", pretty(d.physical_status)],
  ]);
  const keyIcons: Record<string, React.ReactNode> = { Age: <Calendar />, Height: <Ruler />, "Marital Status": <HeartIcon size={22} />, Denomination: <Cross size={22} />, "Mother Tongue": <Msg />, Location: <Pin />, "Physical Status": <Shield size={22} /> };
  const faithRows = present([
    ["Church", d.church_name], ["Church Location", d.church_location], ["Baptism", pretty(d.baptism_status)],
    ["EGF Member", d.egf_member ? (d.egf_member === "yes" ? `Yes${d.egf_details ? ` — ${d.egf_details}` : ""}` : "No") : null],
    ["Pastor / Church Reference", d.is_me ? d.pastor_name : null],
  ]);
  const careerRows = present([["Education", d.education], ["Profession", d.profession], ["Organization", d.organization]]);
  const lifeRows = present([["Diet", pretty(d.eating_habit)], ["Hobbies", d.hobbies], ["Fitness", d.fitness], ["Smoking", pretty(d.smoking_habit)], ["Drinking", pretty(d.drinking_habit)]]);
  const ageRange = d.pref_age_min && d.pref_age_max ? `${d.pref_age_min} - ${d.pref_age_max} Years` : d.pref_age_min ? `${d.pref_age_min}+ Years` : d.pref_age_max ? `Up to ${d.pref_age_max} Years` : null;
  const prefRows = present([["Age", ageRange], ["Education", d.pref_education], ["Location", d.pref_location], ["Qualities", d.pref_qualities]]);
  const famRows = present([["Father", d.father_occupation], ["Mother", d.mother_occupation], ["Siblings", d.siblings !== null ? String(d.siblings) : null]]);
  const show = (id: string) => sections.some((s) => s.id === id);

  return (
    <>
      <Header />
      <main className="pv">
        <PageDecor />
        <div className="pv-wrap">
          {d.is_me && (
            <>
              <div className="pv-own">This is how your profile looks to other members. {!d.verified && "It will appear in search once it has been approved."}</div>
              <CompletenessBar />
            </>
          )}

          {/* ---------- top card ---------- */}
          <section className="pv-hero" id="sec-overview">
            <div className="pv-photo">
              {urls[sel] ? <img src={urls[sel]} alt={d.name} /> : <div className="pv-ph">{d.name.charAt(0)}</div>}
              {!d.is_me && <button type="button" className={`pv-heart${d.shortlisted ? " on" : ""}`} aria-label={d.shortlisted ? "Remove from shortlist" : "Shortlist"} disabled={busy} onClick={toggleShortlist}><HeartIcon size={20} filled={d.shortlisted} /></button>}
            </div>
            <div className="pv-info">
              <div className="pv-top">
                <span className={`pv-badge${d.verified ? "" : " wait"}`}>{d.verified ? "✓ Verified Profile" : "Awaiting approval"}</span>
                {d.match !== null && <span className="pv-match">{d.match}% Match</span>}
                <div className="pv-script">Two souls, one faith,<br />one journey…</div>
              </div>
              <h1>{d.name}, {d.age}</h1>
              <div className="pv-code">{code(d.id)}</div>
              <div className="pv-chips">
                {d.education && <div><span><Cap size={22} /></span><p><b>{d.education}</b>{d.organization && <small>{d.organization}</small>}</p></div>}
                {d.profession && <div><span><Briefcase size={22} /></span><p><b>{d.profession}</b>{location && <small>{location}</small>}</p></div>}
                {d.denomination && <div><span><Cross size={22} /></span><p><b>{d.denomination}</b>{d.church_name && <small>{d.church_name}</small>}</p></div>}
              </div>
              {quote && <blockquote className="pv-quote">“{quote}”</blockquote>}
              {!d.is_me && d.they_interested === "pending" && (
                <div className="pv-interest">
                  <span><HeartIcon size={20} filled /> <b>{d.name.split(" ")[0]}</b> is interested in you.</span>
                  <button type="button" className="pv-btn gold" disabled={busy} onClick={() => answerTheirs("accept")}>Accept</button>
                  <button type="button" className="pv-btn" disabled={busy} onClick={() => answerTheirs("decline")}>Decline</button>
                </div>
              )}
              <div className="pv-actions">
                {d.is_me ? (
                  <>
                    <Link href="/dashboard" className="pv-btn gold"><Pencil size={19} /> Edit Profile</Link>
                    <Link href="/browse" className="pv-btn"><User size={19} /> Browse Matches</Link>
                  </>
                ) : (
                  <>
                    <button type="button" className="pv-btn gold" disabled={busy || d.interest_sent} onClick={() => act("interest")}><HeartIcon size={19} filled={d.interest_sent} /> {d.interest_status === "accepted" ? "Interest Accepted" : d.interest_status === "declined" ? "Interest Declined" : d.interest_sent ? "Interest Sent" : "Send Interest"}</button>
                    <Link href={`/messages?with=${d.id}`} className="pv-btn"><Msg size={19} /> Send Message</Link>
                    <button type="button" className="pv-btn" disabled={busy} title={d.shortlisted ? "Click to remove" : undefined} onClick={toggleShortlist}><HeartIcon size={19} filled={d.shortlisted} /> {d.shortlisted ? "Shortlisted" : "Shortlist"}</button>
                    <div className="pv-more" ref={moreRef}>
                      <button type="button" className="pv-btn" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore(!more)}><Dots size={19} /> More</button>
                      {more && <div className="pv-menu" role="menu"><Link role="menuitem" href="/contact?subject=Report%20a%20Profile"><Flag size={17} /> Report this profile</Link></div>}
                    </div>
                  </>
                )}
              </div>
              {msg && <div className="pv-msg">{msg}</div>}
            </div>
          </section>

          {/* ---------- body ---------- */}
          <div className="pv-body">
            <nav className="pv-nav" aria-label="Profile sections">
              <a href="#sec-overview" className={active === "overview" ? "on" : ""}><HomeIcon size={20} /> Profile Overview</a>
              {sections.map((s) => <a key={s.id} href={`#sec-${s.id}`} className={active === s.id ? "on" : ""}><s.Icon size={20} /> {s.label}</a>)}
            </nav>

            <div className="pv-main">
              {show("about") && (
                <section className="pv-card wide" id="sec-about">
                  <h2><User size={22} /> {d.is_me ? "About Me" : she ? "About Her" : "About Him"}</h2>
                  <div className="pv-about"><p>{d.about}</p><div className="pv-aside"><FaithLeaf size={34} /><i>“Good conversations lead to great journeys.”</i></div></div>
                </section>
              )}

              <section className="pv-card wide" id="sec-personal">
                <h2><Calendar size={22} /> Key Details</h2>
                <div className="pv-keys">
                  {keyRows.map(([k, v]) => <div key={k}><span>{keyIcons[k]}</span><p><small>{k}</small><b>{v}</b></p></div>)}
                </div>
              </section>

              {show("faith") && (
                <section className="pv-card wide" id="sec-faith">
                  <h2><Cross size={22} /> Faith &amp; Beliefs</h2>
                  <dl className="pv-dl cols">{faithRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                  {d.testimony && <div className="pv-testimony"><b>Testimony</b><p>{d.testimony}</p></div>}
                </section>
              )}

              {show("career") && (
                <section className="pv-card" id="sec-career">
                  <h2><Cap size={22} /> Education &amp; Career</h2>
                  <dl className="pv-dl">{careerRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </section>
              )}
              {show("lifestyle") && (
                <section className="pv-card" id="sec-lifestyle">
                  <h2><HeartIcon size={22} /> Lifestyle</h2>
                  <dl className="pv-dl">{lifeRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </section>
              )}
              {show("family") && (
                <section className="pv-card wide" id="sec-family">
                  <h2><Family size={22} /> Family Details</h2>
                  <dl className="pv-dl cols">{famRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </section>
              )}

              {show("interests") && (
                <section className="pv-card" id="sec-interests">
                  <h2><HeartIcon size={22} /> Interests</h2>
                  <div className="pv-tags">{d.interests.map((t) => <span key={t}>{t}</span>)}</div>
                </section>
              )}
              {show("prefs") && (
                <section className="pv-card" id="sec-prefs">
                  <h2><HeartIcon size={22} /> Partner Preferences</h2>
                  <dl className="pv-dl">{prefRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </section>
              )}

              {show("gallery") && (
                <section className="pv-card wide" id="sec-gallery">
                  <h2><Camera size={22} /> Photo Gallery <span>({urls.length})</span></h2>
                  {d.is_me && urls.length === 0 && <p className="pv-empty">You have not added any photos yet. <Link href="/dashboard" className="link-arrow">Add photos</Link></p>}
                  {d.is_me && urls.length > 0 && <p className="pv-empty">Add or change photos from <Link href="/dashboard" className="link-arrow">Edit Profile</Link>.</p>}
                  <div className="pv-gallery">
                    {urls.map((u, i) => <button type="button" key={u} className={i === sel ? "on" : ""} onClick={() => { setSel(i); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={`Photo ${i + 1}`}><img src={u} alt="" /></button>)}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <section className="pv-cta">
          <div><small>Find better matches on Cedar Matrimony</small><h3>Discover compatible profiles with similar interests and values.</h3></div>
          <Link href="/browse" className="pv-cta-btn">View Similar Matches <Arrow size={18} /></Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
