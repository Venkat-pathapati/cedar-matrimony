"use client";
import Icon from "@/components/Icon";
import Photo from "@/components/Photo";
import { GrowthChart, GenderDonut } from "./Charts";
import { fmtDateIST, fmtDateTimeIST } from "@/lib/ist";

const fmtDate = (v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const STATUS = { approved: "Approved", pending: "Pending", rejected: "Rejected", changes_requested: "Changes" };

function Change({ value }) {
  if (value == null) return <span className="muted small">no earlier data yet</span>;
  const up = value >= 0;
  return <span className={`chg ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {Math.abs(value)}% this month</span>;
}

export default function DashboardHome({ dash, months, setMonths, onOpen, go, rail, name = "Admin" }) {
  if (!dash) return <p className="muted">Loading…</p>;
  const stats = [
    ["Total members", "users", dash.total_members, "ic-green"],
    ["Active likes", "heart", dash.active_matches, "ic-pink"],
    ["New registrations", "userPlus", dash.new_registrations, "ic-blue"],
  ];
  return (
    <>
      <div className="dash-top with-rail">
        <div className="primary">
          <section className="hello">
            <Icon name="sun" size={34} />
            <div>
              <h2>{greeting()}, {name}</h2>
              <p>Here is what is happening on your Cedar Matrimony platform today.</p>
            </div>
            <div className="hello-verse">“God has a plan for every couple.”</div>
          </section>

          {dash.pending_review > 0 && (
            <button className="attention" onClick={() => go("registrations")}>
              <Icon name="userPlus" size={18} /> {dash.pending_review} profile{dash.pending_review > 1 ? "s" : ""} waiting for your review <span>Review now →</span>
            </button>
          )}

          <div className="stats">
            {stats.map(([label, icon, s, cls]) => (
              <div className="stat-card" key={label}>
                <span className={`stat-ico ${cls}`}><Icon name={icon} size={22} /></span>
                <div>
                  <div className="muted">{label}</div>
                  <div className="stat-num">{s.value.toLocaleString()}</div>
                  <Change value={s.change} />
                </div>
              </div>
            ))}
          </div>

          <div className="two">
            <div className="panel">
              <div className="panel-head">
                <h3><Icon name="trend" size={18} /> Member growth</h3>
                <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ width: "auto" }} aria-label="Growth range">
                  <option value={6}>Last 6 months</option><option value={12}>Last 12 months</option>
                </select>
              </div>
              <GrowthChart data={dash.growth} />
            </div>
            <div className="panel">
              <div className="panel-head"><h3><Icon name="users" size={18} /> Gender distribution</h3></div>
              <GenderDonut male={dash.gender.male} female={dash.gender.female} />
            </div>
          </div>
        </div>
        {rail}
      </div>

      <div className="two wide-left">
        <div className="panel">
          <div className="panel-head">
            <h3><Icon name="users" size={18} /> Reports</h3>
            <button className="link-plain" onClick={() => go("members")}>View All</button>
          </div>
          <div className="tablewrap flat">
            <table className="table recent">
              <thead><tr><th>Name</th><th>Age</th><th>Location</th><th>Status</th><th>Joined On</th><th>Modified On (IST)</th></tr></thead>
              <tbody>
                {dash.recent_members.length === 0 && <tr><td colSpan={6} className="muted">No members yet.</td></tr>}
                {dash.recent_members.map((m) => (
                  <tr key={m.member_id} className="clickable" onClick={() => onOpen(m.member_id)}>
                    <td><span className="who">{m.photo_id || m.photo_url ? <Photo id={m.photo_id} url={m.photo_url} size={32} alt={m.name} /> : <span className="ini">{initials(m.name)}</span>}<strong>{m.name}</strong></span></td>
                    <td>{m.age}</td>
                    <td>{m.location || "—"}</td>
                    <td><span className={`pill ${m.approval_status}`}>{STATUS[m.approval_status] || m.approval_status}</span></td>
                    <td className="muted">{fmtDateIST(m.created_at)}</td>
                    <td className="muted">{fmtDateTimeIST(m.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3><Icon name="grid" size={18} /> Quick Actions</h3></div>
          <div className="quick">
            <button className="qa" onClick={() => go("members", { status: "", add: true })}><span className="qa-ico g"><Icon name="userPlus" size={26} /></span><strong>Add New Member</strong><span>Register a new profile</span></button>
            <button className="qa" onClick={() => go("matches")}><span className="qa-ico r"><Icon name="heart" size={26} /></span><strong>View Likes</strong><span>Accepted interests</span></button>
            <button className="qa" onClick={() => go("photos")}><span className="qa-ico p"><Icon name="image" size={26} /></span><strong>Review Photos</strong><span>{dash.photos_pending} waiting for review</span></button>
            <button className="qa" onClick={() => go("members")}><span className="qa-ico g"><Icon name="flag" size={26} /></span><strong>View Reports</strong><span>Recent members</span></button>
          </div>
        </div>
      </div>
    </>
  );
}
