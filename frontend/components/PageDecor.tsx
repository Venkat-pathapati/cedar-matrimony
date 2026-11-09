/** Soft olive-leaf branches with gold dots, placed along the page edges. Put inside a `position:relative; overflow:hidden` parent. */
const f = (n: number) => n.toFixed(2);
const COLORS = ["#9FB287", "#B8C79F", "#D5DFBE", "#8DA374", "#C9D6B0"];

function Cluster({ className }: { className: string }) {
  // main stem (cubic bezier) plus a shorter side branch
  const stem = [[10, 292], [70, 232], [122, 142], [252, 30]];
  const branch = [[120, 160], [160, 150], [200, 150], [270, 110]];
  const at = (P: number[][], t: number) => {
    const u = 1 - t;
    const x = u ** 3 * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0];
    const y = u ** 3 * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1];
    const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    return { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
  };
  const leaf = (P: number[][], ts: number[], scale: number, key: string) =>
    ts.flatMap((t, i) => [1, -1].map((side) => {
      const { x, y, ang } = at(P, t);
      const s = scale * (1.25 - t * 0.55);
      return <path key={`${key}${i}${side}`} d="M0 0C10 -10 28 -10 42 0C28 10 10 10 0 0Z"
        fill={COLORS[(i * 2 + (side > 0 ? 0 : 1)) % COLORS.length]} opacity={0.82}
        transform={`translate(${f(x)} ${f(y)}) rotate(${f(ang + side * 38)}) scale(${f(s)})`} />;
    }));
  return (
    <svg viewBox="0 0 300 300" className={`dc ${className}`}>
      <path d={`M${stem[0]} C${stem[1]} ${stem[2]} ${stem[3]}`} fill="none" stroke="#98AA80" strokeWidth="2" />
      <path d={`M${branch[0]} C${branch[1]} ${branch[2]} ${branch[3]}`} fill="none" stroke="#98AA80" strokeWidth="1.6" />
      {leaf(stem, [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92], 1.05, "a")}
      {leaf(branch, [0.15, 0.4, 0.65, 0.9], 0.8, "b")}
      <path d="M-6 214C70 186 170 190 306 160" fill="none" stroke="#D9BE86" strokeWidth="1.1" opacity="0.85" />
      {[[34, 190], [56, 184], [80, 182], [104, 176], [130, 176]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 2 ? 2.8 : 3.8} fill="#D9BE86" opacity="0.9" />)}
    </svg>
  );
}

export default function PageDecor({ few = false }: { few?: boolean }) {
  return (
    <div className={`decor${few ? " few" : ""}`} aria-hidden="true">
      <Cluster className="tl" /><Cluster className="tr" /><Cluster className="ml" /><Cluster className="mr" /><Cluster className="bl" /><Cluster className="br" />
    </div>
  );
}
