"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Filter, Grid, HeartIcon, ListIcon, Shield, Star } from "@/components/Icons";
import ProfileCard from "@/components/ProfileCard";
import { clientGet, type Profile } from "@/lib/api";
import { logout } from "@/lib/auth";

const PAGE_SIZE = 12;
const MIN = 18, MAX = 60;
type F = { minAge: number; maxAge: number; location: string; education: string; occupation: string; denomination: string; marital: string };
const pretty = (o: string) => { const t = o.replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };
const uniq = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter((x): x is string => !!x && !!x.trim()))).sort();

function Results() {
  const router = useRouter();
  const params = useSearchParams();
  const initial: F = useMemo(() => ({
    minAge: Math.max(MIN, Number(params.get("min_age")) || MIN),
    maxAge: Math.min(MAX, Number(params.get("max_age")) || MAX),
    location: params.get("city") ?? "", education: "", occupation: "",
    denomination: params.get("denomination") ?? "", marital: "",
  }), [params]);

  const [all, setAll] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<F>(initial);
  const [applied, setApplied] = useState<F>(initial);
  const [sort, setSort] = useState("match");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  useEffect(() => { setDraft(initial); setApplied(initial); setPage(1); }, [initial]);

  useEffect(() => {
    if (!localStorage.getItem("cedar_token")) { router.replace("/login"); return; }
    clientGet<Profile[]>("/api/profiles?min_age=18&max_age=80")
      .then(setAll)
      .catch((e) => {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") { logout(); router.replace("/login"); }
        else setError(e instanceof Error ? e.message : "Something went wrong");
      });
  }, [router]);

  const opts = useMemo(() => ({
    cities: uniq((all ?? []).map((p) => p.city)),
    education: uniq((all ?? []).map((p) => p.education)),
    occupation: uniq((all ?? []).map((p) => p.profession)),
    denominations: uniq((all ?? []).map((p) => p.denomination)),
    marital: uniq((all ?? []).map((p) => p.marital_status)),
  }), [all]);

  const shown = useMemo(() => {
    const eq = (a: string | null | undefined, b: string) => !b || (a ?? "").toLowerCase() === b.toLowerCase();
    const rows = (all ?? []).filter((p) =>
      p.age >= applied.minAge && p.age <= applied.maxAge &&
      eq(p.city, applied.location) && eq(p.education, applied.education) && eq(p.profession, applied.occupation) &&
      eq(p.denomination, applied.denomination) && eq(p.marital_status, applied.marital));
    const by: Record<string, (a: Profile, b: Profile) => number> = {
      match: (a, b) => (b.match ?? 0) - (a.match ?? 0),
      ageAsc: (a, b) => a.age - b.age,
      ageDesc: (a, b) => b.age - a.age,
    };
    return [...rows].sort(by[sort]);
  }, [all, applied, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const slice = shown.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const from = shown.length ? (cur - 1) * PAGE_SIZE + 1 : 0;
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });
  const reset = () => { const z: F = { minAge: MIN, maxAge: MAX, location: "", education: "", occupation: "", denomination: "", marital: "" }; setDraft(z); setApplied(z); setPage(1); };
  const sel = (label: string, k: keyof F, options: string[], fmt: (s: string) => string = (s) => s) => (
    <div className="f-group">
      <label className="f-label" htmlFor={`b-${k}`}>{label}</label>
      <select id={`b-${k}`} value={draft[k] as string} onChange={set(k)}>
        <option value="">Any {label}</option>
        {options.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
      </select>
    </div>
  );
  const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;

  return (
    <>
      <section className="bhero">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><i>›</i>Profiles</div>
          <h1>Find Your Perfect Match</h1>
          <p><b>Real People.</b> Genuine Profiles. Meaningful Connections.</p>
          <div className="heart-rule"><HeartIcon size={16} /></div>
        </div>
      </section>

      <div className="bwrap">
        <aside className="filters">
          <div className="filters-head"><b><Filter /> Search Filters</b><button type="button" onClick={reset}>Reset All</button></div>
          <div className="f-group">
            <div className="f-label">Age Range <span>{draft.minAge} - {draft.maxAge}{draft.maxAge === MAX ? "+" : ""}</span></div>
            <div className="range">
              <div className="track" />
              <div className="fill" style={{ left: `${pct(draft.minAge)}%`, right: `${100 - pct(draft.maxAge)}%` }} />
              <input type="range" aria-label="Minimum age" min={MIN} max={MAX} value={draft.minAge} onChange={(e) => setDraft({ ...draft, minAge: Math.min(Number(e.target.value), draft.maxAge) })} />
              <input type="range" aria-label="Maximum age" min={MIN} max={MAX} value={draft.maxAge} onChange={(e) => setDraft({ ...draft, maxAge: Math.max(Number(e.target.value), draft.minAge) })} />
            </div>
          </div>
          {sel("Location", "location", opts.cities)}
          {sel("Education", "education", opts.education)}
          {sel("Occupation", "occupation", opts.occupation)}
          {sel("Denomination", "denomination", opts.denominations)}
          {sel("Marital Status", "marital", opts.marital, pretty)}
          <button type="button" className="btn" onClick={() => { setApplied(draft); setPage(1); }}>Find Matches</button>
        </aside>

        <main>
          <div className="featured-strip">
            <div><h2>Featured Matches</h2><div className="sub">Handpicked for you based on your preferences</div></div>
            {[[HeartIcon, "Smart Matching", "Better compatibility suggestions"], [Shield, "Verified Profiles", "Safe & genuine members"], [Star, "Personalized Search", "Based on your preferences"], [Shield, "Trusted Platform", "Faith-centered community"]].map(([Ic, t, d]) => {
              const Icon = Ic as typeof HeartIcon;
              return <div className="fs-item" key={t as string}><span className="fs-ic"><Icon size={16} /></span><b>{t as string}</b><span>{d as string}</span></div>;
            })}
          </div>

          <div className="toolbar">
            <div className="count">{all ? `Showing ${from} - ${Math.min(cur * PAGE_SIZE, shown.length)} of ${shown.length} profiles` : "Loading…"}</div>
            <div className="toolbar-r">
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="match">Sort by: Most Compatible</option>
                <option value="ageAsc">Sort by: Age (low to high)</option>
                <option value="ageDesc">Sort by: Age (high to low)</option>
              </select>
              <div className="vtoggle">
                <button type="button" aria-label="Grid view" className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}><Grid /></button>
                <button type="button" aria-label="List view" className={view === "list" ? "on" : ""} onClick={() => setView("list")}><ListIcon /></button>
              </div>
            </div>
          </div>

          {error && (
            <div className="empty">{error}{error.includes("profile first") && <> — <Link href="/dashboard" className="link-arrow">Create your profile</Link></>}</div>
          )}
          {all && !error && shown.length === 0 && <div className="empty">No profiles match these filters yet. Try widening your search.</div>}
          <div className={`bgrid${view === "list" ? " list" : ""}`}>
            {slice.map((p) => <ProfileCard key={p.id} p={p} detailed />)}
          </div>

          {pages > 1 && (
            <div className="pager">
              <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)}>‹</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <button key={n} type="button" className={n === cur ? "on" : ""} onClick={() => setPage(n)}>{n}</button>)}
              <button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)}>›</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default function BrowsePage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}><Results /></Suspense>
      <Footer />
    </>
  );
}
