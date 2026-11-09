"use client";

import { useEffect, useState } from "react";
import { fetchPhotoUrl, type Profile } from "@/lib/api";

/** Round (or square) profile picture: uploaded photo when there is one, else the seed photo, else the first letter. */
export default function Avatar({ p, size = 48, square = false }: { p: Profile; size?: number; square?: boolean }) {
  const [src, setSrc] = useState<string | null>(p.photo_url);
  useEffect(() => {
    let live = true;
    if (p.photo_id) fetchPhotoUrl(p.photo_id).then((u) => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [p.photo_id]);
  return (
    <span className={`mg-av${square ? " sq" : ""}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : p.name.charAt(0)}
    </span>
  );
}
