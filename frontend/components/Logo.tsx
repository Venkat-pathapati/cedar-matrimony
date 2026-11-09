import Link from "next/link";

/** Brand logo (public/images/logo.png). Use variant="light" on dark backgrounds. */
export default function Logo({ variant = "dark", height = 64 }: { variant?: "dark" | "light"; height?: number }) {
  return (
    <Link href="/" className="logo" aria-label="Cedar Matrimony – home">
      <img src={variant === "light" ? "/images/logo-light.png" : "/images/logo.png"} alt="Cedar Matrimony" style={{ height, width: "auto" }} />
    </Link>
  );
}
