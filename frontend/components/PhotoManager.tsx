"use client";

import { useCallback, useEffect, useState } from "react";
import { clientDelete, clientGet, clientPutEmpty, clientUpload, fetchPhotoUrl, forgetPhoto } from "@/lib/api";

type PhotoRow = { id: number; position: number };

function Thumb({ id }: { id: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchPhotoUrl(id).then((u) => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [id]);
  return src ? <img className="pm-img" src={src} alt="" /> : <div className="pm-img pm-ph">…</div>;
}

export default function PhotoManager() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => clientGet<PhotoRow[]>("/api/photos/mine").then(setPhotos).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try { await clientUpload("/api/photos", file); await load(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function act(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); await load(); } catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong"); }
  }

  return (
    <div className="pcard">
      <h3>Photos</h3>
      <p className="muted">JPG, PNG or WebP, up to 5 MB. Only signed-in members can see your photos.</p>
      {err && <div className="msg err">{err}</div>}
      <div className="thumbs">
        {photos.map((p) => (
          <div className="thumb" key={p.id}>
            <Thumb id={p.id} />
            <div className="muted">{p.position === 0 ? "Main photo" : " "}</div>
            <div className="row" style={{ justifyContent: "center" }}>
              {p.position !== 0 && <button type="button" className="btn btn-outline btn-xs" onClick={() => act(() => clientPutEmpty(`/api/photos/${p.id}/main`))}>Make main</button>}
              <button type="button" className="btn btn-xs btn-danger" onClick={() => { if (confirm("Delete this photo?")) { forgetPhoto(p.id); act(() => clientDelete(`/api/photos/${p.id}`)); } }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <label className="btn btn-gold btn-sm" style={{ cursor: "pointer" }}>
        {busy ? "Uploading…" : "＋ Add photo"}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} style={{ display: "none" }} />
      </label>
    </div>
  );
}
