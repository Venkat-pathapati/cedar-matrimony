"use client";
import Icon from "@/components/Icon";

const KIND = {
  signup: ["userPlus", "k-green"],
  approve: ["check", "k-green"],
  reject: ["x", "k-red"],
  changes: ["pencil", "k-amber"],
  interest: ["heart", "k-pink"],
  other: ["zap", "k-green"],
};

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) { const h = Math.floor(s / 3600); return `${h} hour${h > 1 ? "s" : ""} ago`; }
  const d = Math.floor(s / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export default function ActivityPanel({ items, onOpen }) {
  return (
    <aside className="rail">
      <div className="panel">
        <div className="panel-head"><h3><Icon name="zap" size={18} /> Recent activities</h3></div>
        {(!items || items.length === 0) && <p className="muted">Activity will show up here as members sign up and you review profiles.</p>}
        <ul className="acts">
          {items?.map((a, i) => {
            const [icon, cls] = KIND[a.kind] || KIND.other;
            return (
              <li key={i}>
                <span className={`act-ico ${cls}`}><Icon name={icon} size={16} /></span>
                <div className="grow">
                  <button className="link-plain" onClick={() => onOpen(a.member_id)}>{a.name}</button>
                  <div className="muted">{a.text}</div>
                  <div className="muted small">{timeAgo(a.at)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="verse-card">
        <Icon name="book" size={22} />
        <h4>Faith brings true love</h4>
        <p>Trust in the Lord with all your heart, and He will make your paths straight.</p>
        <small>Proverbs 3:5-6</small>
      </div>
    </aside>
  );
}
