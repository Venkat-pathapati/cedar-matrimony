"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/providers";
import Icon from "@/components/Icon";
import Sidebar from "@/components/admin/Sidebar";
import DashboardHome from "@/components/admin/DashboardHome";
import ActivityPanel from "@/components/admin/ActivityPanel";
import MembersTab from "@/components/admin/MembersTab";
import MatchesTab from "@/components/admin/MatchesTab";
import SettingsTab from "@/components/admin/SettingsTab";
import ReviewPanel from "@/components/admin/ReviewPanel";
import { PhotosTab, ReportsTab, AuditTab, EnquiriesTab } from "@/components/admin/Tabs";

const TITLES = {
  dashboard: "Dashboard", members: "Members", registrations: "New registrations", matches: "Likes",
  approved: "Approved profiles", photos: "Photo review", reports: "Escalations", enquiries: "Website enquiries", audit: "Audit log", settings: "Settings",
};
// Views that are just the Members table with a starting filter.
const MEMBER_VIEWS = { members: { status: "" }, registrations: { status: "pending" }, approved: { status: "approved" } };

export default function Admin() {
  const { user, loading } = useRequireAuth(true);
  const { logout } = useAuth();
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState(null);
  const [open, setOpen] = useState(null);
  const [dash, setDash] = useState(null);
  const [months, setMonths] = useState(6);
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const isAdmin = user?.role === "admin";
  const loadDash = useCallback(() => api("/admin/dashboard", { params: { months } }).then((d) => { setDash(d); setErr(""); }).catch((e) => setErr(e.message)), [months]);
  useEffect(() => { if (isAdmin) loadDash(); }, [isAdmin, loadDash, tick, view]);  // also reload when you come back to a section
  useEffect(() => { if (!isAdmin) return; const t = setInterval(loadDash, 30000); return () => clearInterval(t); }, [isAdmin, loadDash]);  // keep recent activities fresh

  // keep the section in the URL hash so a refresh or a shared link lands in the same place
  useEffect(() => { const h = window.location.hash.slice(1); if (TITLES[h]) setView(h); }, []);
  const navigate = (v, f = null) => {
    setView(v);
    setFilter(f ? { ...f, _n: Date.now() } : MEMBER_VIEWS[v] ? { ...MEMBER_VIEWS[v], _n: Date.now() } : null);
    window.history.replaceState(null, "", `#${v}`);
  };
  const changed = () => setTick((n) => n + 1);
  const search = (e) => { e.preventDefault(); navigate("members", { status: "", q: q.trim() }); };

  if (loading || !isAdmin) return <p style={{ padding: 24 }}>Loading…</p>;
  const counts = dash && { pending_review: dash.pending_review, photos_pending: dash.photos_pending, open_reports: dash.open_reports };

  return (
    <div className="cedar-app">
      <Sidebar view={view} onNavigate={(v) => navigate(v)} counts={counts} />
      <div className="cedar-main">
        <header className="topbar">
          <form className="searchbox" onSubmit={search}>
            <Icon name="search" size={18} />
            <input placeholder="Search members, ID, or name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
          </form>
          <button className="bell" onClick={() => navigate("registrations")} aria-label={`${dash?.pending_review || 0} profiles to review`}>
            <Icon name="bell" size={20} />{dash?.pending_review > 0 && <span className="bell-dot" />}
          </button>
          <div className="me">
            <span className="me-ava">A</span>
            <div><strong>Admin</strong><div className="muted small">Super admin</div></div>
            <button className="icon-btn" onClick={async () => { await logout(); window.location.href = "/login"; }} aria-label="Log out" title="Log out"><Icon name="logout" size={18} /></button>
          </div>
        </header>

        <div className="content">
          {view !== "dashboard" && <h2 className="page-title">{TITLES[view]}</h2>}
          {err && <div className="msg err">{err}</div>}
          {view === "dashboard" && (
            <DashboardHome
              dash={dash}
              months={months}
              setMonths={setMonths}
              onOpen={setOpen}
              go={navigate}
              rail={<ActivityPanel items={dash?.activities} onOpen={setOpen} />}
            />
          )}
          {MEMBER_VIEWS[view] && <MembersTab key={`${view}-${filter?._n}`} filter={filter} onOpen={setOpen} refreshKey={tick} />}
          {view === "matches" && <MatchesTab onOpen={setOpen} refreshKey={tick} />}
          {view === "photos" && <PhotosTab onOpen={setOpen} onChanged={changed} refreshKey={tick} />}
          {view === "reports" && <ReportsTab onOpen={setOpen} onChanged={changed} refreshKey={tick} />}
          {view === "enquiries" && <EnquiriesTab />}
          {view === "audit" && <AuditTab />}
          {view === "settings" && <SettingsTab user={user} />}
        </div>
      </div>

      {open && (
        <div className="drawer-wrap">
          <div className="drawer-backdrop" onClick={() => setOpen(null)} />
          <ReviewPanel key={open} memberId={open} onClose={() => setOpen(null)} onChanged={changed} />
        </div>
      )}
    </div>
  );
}
