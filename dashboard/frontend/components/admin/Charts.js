"use client";

function niceMax(v) {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

export function GrowthChart({ data }) {
  const W = 560, H = 230, L = 46, R = 16, T = 14, B = 30;
  const max = niceMax(Math.max(...data.map((d) => d.total), 1));
  const x = (i) => L + (data.length === 1 ? 0 : (i * (W - L - R)) / (data.length - 1));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const pts = data.map((d, i) => `${x(i)},${y(d.total)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Member growth over time">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={L - 8} y={y(t) + 4} fontSize="11" fill="var(--muted)" textAnchor="end">{t.toLocaleString()}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`} fill="var(--cedar-2)" fillOpacity="0.12" />
      <polyline points={pts} fill="none" stroke="var(--cedar-2)" strokeWidth="2.2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.total)} r="4" fill="#fff" stroke="var(--cedar-2)" strokeWidth="2"><title>{`${d.label}: ${d.total.toLocaleString()} members`}</title></circle>
          <text x={x(i)} y={H - 8} fontSize="11" fill="var(--muted)" textAnchor="middle">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function GenderDonut({ male, female }) {
  const total = male + female;
  const R = 52, C = 2 * Math.PI * R;
  const mLen = total ? (male / total) * C : 0;
  const pct = (n) => (total ? Math.round((n * 100) / total) : 0);
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`${male} male, ${female} female`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={total ? "#e0527a" : "var(--line)"} strokeWidth="20" />
        {total > 0 && <circle cx="70" cy="70" r={R} fill="none" stroke="var(--cedar-2)" strokeWidth="20" strokeDasharray={`${mLen} ${C - mLen}`} transform="rotate(-90 70 70)" />}
        <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text)">{total.toLocaleString()}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="var(--muted)">Total members</text>
      </svg>
      <div className="legend">
        <div><span className="dot" style={{ background: "var(--cedar-2)" }} /> Male <strong>{male.toLocaleString()}</strong> <span className="muted">({pct(male)}%)</span></div>
        <div><span className="dot" style={{ background: "#e0527a" }} /> Female <strong>{female.toLocaleString()}</strong> <span className="muted">({pct(female)}%)</span></div>
      </div>
    </div>
  );
}
