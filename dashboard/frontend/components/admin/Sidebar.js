"use client";
import Brand from "@/components/Brand";
import Icon from "@/components/Icon";
import { SITE } from "@/lib/api";

// No Messages entry on purpose: member chat is not moderated from the admin console.
const NAV = [
  ["dashboard", "Dashboard", "home"],
  ["members", "Members", "users"],
  ["registrations", "New registrations", "userPlus", "pending_review"],
  ["matches", "Likes", "heart"],
  ["approved", "Approved profiles", "shield"],
  ["photos", "Photo review", "image", "photos_pending"],
  ["reports", "Escalations", "flag", "open_reports"],
  ["enquiries", "Website enquiries", "mail"],
  ["audit", "Audit log", "file"],
  ["settings", "Settings", "sliders"],
];

export default function Sidebar({ view, onNavigate, counts }) {
  return (
    <aside className="side">
      <Brand light />
      <div className="side-verse">
        <div className="side-cross">✝</div>
        <em>“Two are better than one…”</em>
        <small>Ecclesiastes 4:9</small>
      </div>
      <nav className="side-nav" aria-label="Admin sections">
        {NAV.map(([key, label, icon, badge]) => {
          const n = badge ? counts?.[badge] : 0;
          return (
            <button key={key} className={`side-item ${view === key ? "on" : ""}`} onClick={() => onNavigate(key)} aria-current={view === key ? "page" : undefined}>
              <Icon name={icon} size={19} />
              <span>{label}</span>
              {n > 0 && <span className="side-badge">{n > 99 ? "99+" : n}</span>}
            </button>
          );
        })}
      </nav>
      <a className="side-item side-site" href={SITE} target="_blank" rel="noreferrer"><Icon name="home" size={19} /><span>View website ↗</span></a>
    </aside>
  );
}