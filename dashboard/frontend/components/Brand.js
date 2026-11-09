// Cedar Matrimony logo (public/logo.png). `light` puts it on a white card so it stays visible on the green sidebar.
export default function Brand({ light = false, size = "md" }) {
  return (
    <div className={`brand-mark ${light ? "light" : ""} ${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Cedar Matrimony" className="brand-logo" />
    </div>
  );
}
