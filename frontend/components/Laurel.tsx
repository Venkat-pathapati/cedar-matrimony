import type { ReactNode } from "react";

const f = (n: number) => n.toFixed(2);

/** Circular gold-ringed badge with a small laurel sprig on each side (used by the "Why Choose" cards). */
export function Laurel({ children }: { children: ReactNode }) {
  const leaves = [108, 122, 136, 150, 164, 177].map((deg, i) => {
    const a = (deg * Math.PI) / 180, r = i % 2 ? 61 : 64;
    return { x: 75 + r * Math.cos(a), y: 59 + r * Math.sin(a), rot: deg + 180 - 28 };
  });
  const sprig = leaves.map((l, i) => (
    <path key={i} d="M0 0C3 -3 3 -8 0 -12C-3 -8 -3 -3 0 0Z" transform={`translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)})`} />
  ));
  return (
    <div className="laurel" aria-hidden="true">
      <svg viewBox="0 0 150 118" className="laurel-svg">
        <g fill="#D9BE86">{sprig}</g>
        <g fill="#D9BE86" transform="translate(150 0) scale(-1 1)">{sprig}</g>
      </svg>
      <div className="laurel-ring">{children}</div>
    </div>
  );
}

/** Soft olive-leaf branch with gold dots, used as a corner decoration. */
export function Sprig({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const P = [[8, 250], [70, 205], [118, 120], [215, 38]];            // cubic bezier control points
  const pt = (t: number) => {
    const u = 1 - t;
    const x = u ** 3 * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0];
    const y = u ** 3 * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1];
    const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    return { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
  };
  const ts = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.95];
  return (
    <svg viewBox="0 0 260 260" className={className} style={style} aria-hidden="true">
      <path d={`M${P[0]} C${P[1]} ${P[2]} ${P[3]}`} fill="none" stroke="#B9BE9F" strokeWidth="1.6" />
      {ts.map((t, i) => {
        const { x, y, ang } = pt(t), s = 1.9 - t * 0.7;
        return [1, -1].map((side) => (
          <path key={`${i}${side}`} d="M0 0C9 -8 24 -8 34 0C24 8 9 8 0 0Z"
            fill={(i + (side > 0 ? 0 : 1)) % 3 === 0 ? "#E8DDBF" : "#B3BA96"} opacity={0.62}
            transform={`translate(${f(x)} ${f(y)}) rotate(${f(ang + side * 42)}) scale(${f(s)})`} />
        ));
      })}
      <path d="M-4 200C60 170 150 170 262 150" fill="none" stroke="#D9BE86" strokeWidth="1.1" opacity="0.8" />
      {[[40, 168], [58, 160], [78, 158], [96, 148], [112, 150]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 2 ? 2.6 : 3.4} fill="#D9BE86" opacity="0.85" />)}
    </svg>
  );
}
