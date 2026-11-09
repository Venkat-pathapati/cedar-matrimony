"use client";
import { useEffect, useState } from "react";
import { fetchPhotoUrl, siteUrl } from "@/lib/api";

// Shows an uploaded photo (private: fetched with the admin token), a sample photo from the website (url), or a placeholder.
export default function Photo({ id, url, size = 64, alt = "" }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let live = true;
    setSrc(null);
    if (id) fetchPhotoUrl(id).then((u) => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [id]);
  const style = { width: size, height: size };
  const shown = id ? src : siteUrl(url);
  if (!shown) return <div className="avatar" style={{ ...style, fontSize: size / 2.5 }} aria-label={alt}>{id ? "…" : "👤"}</div>;
  return <img className="avatar" style={style} src={shown} alt={alt} />;
}
