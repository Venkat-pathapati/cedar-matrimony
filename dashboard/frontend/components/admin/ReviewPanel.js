"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Photo from "@/components/Photo";
import { siteUrl } from "@/lib/api";
import MemberForm from "@/components/admin/MemberForm";

const SECTIONS = [
  ["Personal", ["registering_for", "first_name", "last_name", "gender", "date_of_birth", "height_cm", "marital_status", "physical_status", "mother_tongue"]],
  ["Faith & reference", ["denomination", "church_name", "church_location", "baptism_status", "pastor_name", "pastor_phone", "egf_member", "egf_details"]],
  ["Location", ["country", "state", "district", "city"]],
  ["Education & work", ["education", "occupation", "organization", "annual_income"]],
  ["Family & lifestyle", ["father_occupation", "mother_occupation", "siblings", "eating_habit", "smoking_habit", "drinking_habit", "hobbies", "fitness", "interests"]],
  ["Partner preferences", ["pref_age_min", "pref_age_max", "pref_education", "pref_location", "pref_qualities"]],
];
const show = (v) => (Array.isArray(v) ? v.join(", ") : String(v).replace(/_/g, " "));
const label = (k) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
import { fmtDateTimeIST } from "@/lib/ist";
const when = (v) => (v ? fmtDateTimeIST(v) : "—");

export default function ReviewPanel({ memberId, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState({ plan: "silver", months: 3 });
  const [msg, setMsg] = useState({ t: "", ok: true });
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => api(`/admin/members/${memberId}`).then(setD).catch((e) => setMsg({ t: e.message, ok: false })), [memberId]);
  useEffect(() => { setD(null); setNote(""); setMsg({ t: "", ok: true }); load(); }, [load]);

  const act = async (path, body = {}, done) => {
    setMsg({ t: "", ok: true });
    try {
      const r = await api(path, { method: "POST", body });
      setMsg({ t: done || r.message, ok: true });
      setNote("");
      await load();
      onChanged?.();
    } catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  const del = async (path, ask, closeAfter) => {
    if (!confirm(ask)) return;
    try { await api(path, { method: "DELETE" }); onChanged?.(); if (closeAfter) onClose(); else await load(); }
    catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  const needNote = (fn) => () => (note.trim() ? fn() : setMsg({ t: "Write a note for the member first (it is shown to them).", ok: false }));

  if (!d) return <div className="drawer"><button className="btn small ghost" onClick={onClose}>✕ Close</button>{msg.t ? <div className="msg err">{msg.t}</div> : <p>Loading…</p>}</div>;
  const { account: a, profile: p, activity: ac } = d;
  const base = `/admin/profiles/${d.member_id}`;

  return (
    <div className="drawer">
      <div className="row between">
        <span className="who"><Photo id={d.photos[0]?.id} url={d.sample_photo_url} size={56} alt={`${p.first_name} ${p.last_name}`} />
          <h3 style={{ margin: 0 }}>{p.first_name} {p.last_name} <span className="muted">{d.member_id}</span></h3></span>
        <button className="btn small ghost" onClick={onClose}>✕ Close</button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small" onClick={() => setEditing(true)}>Edit member</button>
        <button className="btn small danger" onClick={() => del(`/admin/members/${d.member_id}`, `Delete ${p.first_name} ${p.last_name} (${d.member_id}) permanently? Photos, interests and chats are removed too.`, true)}>Delete member</button>
      </div>
      {editing && <MemberForm memberId={d.member_id} onClose={() => setEditing(false)} onSaved={() => { load(); onChanged?.(); }} />}
      <div className="row" style={{ margin: "8px 0" }}>
        <span className={`badge ${d.approval_status}`}>{d.approval_status.replace("_", " ")}</span>
        <span className={`badge ${a.status === "active" ? "approved" : "rejected"}`}>account {a.status}</span>
        <span className="badge">plan {a.plan}</span>
        {d.is_hidden && <span className="badge">hidden by member</span>}
      </div>
      {msg.t && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}

      <div className="card">
        <h4>Decision</h4>
        {d.admin_notes && <p className="muted">Last note: {d.admin_notes}</p>}
        <textarea placeholder="Note to the member (required for reject / request changes)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn small" disabled={d.approval_status === "approved"} onClick={() => act(`${base}/approve`, { notes: note || null })}>Approve</button>
          <button className="btn small ghost" onClick={needNote(() => act(`${base}/request-changes`, { notes: note }))}>Request changes</button>
          <button className="btn small danger" disabled={d.approval_status === "rejected"} onClick={needNote(() => act(`${base}/reject`, { notes: note }))}>Reject</button>
        </div>
      </div>

      <div className="card">
        <h4>Account</h4>
        {a.has_account
          ? <p>📞 {a.phone || "no phone"} {a.phone ? (a.phone_verified ? "✓ verified" : "(not verified)") : ""} · ✉ {a.email || "no email"} {a.email_verified ? "✓ verified" : "(not verified)"}</p>
          : <p className="muted">Sample profile: no login account, phone or email.</p>}
        <p className="muted">Profile for: {a.profile_for} · joined {when(a.created_at || d.created_at)} · modified {when(d.updated_at)}</p>
        <p className="muted">Plan: {a.plan}{a.plan_expires ? ` (until ${when(a.plan_expires)})` : ""}</p>
        {a.has_account && <div className="row">
          {a.status === "suspended" || a.status === "deactivated"
            ? <button className="btn small" onClick={() => act(`/admin/users/${d.user_id}/reactivate`)}>Reactivate account</button>
            : <button className="btn small danger" onClick={() => { if (confirm("Suspend this account? Their sessions end immediately.")) act(`/admin/users/${d.user_id}/suspend`); }}>Suspend account</button>}
          <select value={plan.plan} onChange={(e) => setPlan({ ...plan, plan: e.target.value })} style={{ width: 110 }}>
            {["free", "silver", "gold", "platinum"].map((x) => <option key={x}>{x}</option>)}
          </select>
          <input type="number" min={1} max={24} value={plan.months} onChange={(e) => setPlan({ ...plan, months: Number(e.target.value) })} style={{ width: 70 }} title="months" />
          <button className="btn small ghost" onClick={() => act(`/admin/users/${d.user_id}/plan`, plan)}>Set plan</button>
        </div>}
      </div>

      <div className="card">
        <h4>Photos ({d.photos.length})</h4>
        {d.photos.length === 0 && !d.sample_photo_url && <p className="muted">No photos uploaded.</p>}
        <div className="thumbs">
          {d.photos.map((ph) => (
            <div className="thumb" key={ph.id}>
              <Photo id={ph.id} size={120} />
              <div><span className={`badge ${ph.status}`}>{ph.status}</span></div>
              <div className="row" style={{ justifyContent: "center" }}>
                <button className="btn small" disabled={ph.status === "approved"} onClick={() => act(`/admin/photos/${ph.id}/approve`)}>Approve</button>
                <button className="btn small danger" disabled={ph.status === "rejected"} onClick={() => act(`/admin/photos/${ph.id}/reject`)}>Reject</button>
                <button className="btn small ghost" onClick={() => del(`/admin/photos/${ph.id}`, "Delete this photo permanently?")}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(d.sample_photo_url || d.gallery_urls?.length > 0) && (
        <div className="card">
          <h4>Sample photos (shown on the website)</h4>
          <div className="thumbs gallery">
            {[d.sample_photo_url, ...(d.gallery_urls || [])].filter(Boolean).map((u) => (
              <a key={u} href={siteUrl(u)} target="_blank" rel="noreferrer"><Photo url={u} size={96} /></a>
            ))}
          </div>
        </div>
      )}

      {SECTIONS.map(([title, keys]) => (
        <div className="card" key={title}>
          <h4>{title}</h4>
          {keys.map((k) => <p key={k}><span className="muted">{label(k)}: </span>{p[k] == null || p[k] === "" || (Array.isArray(p[k]) && !p[k].length) ? "—" : show(p[k])}</p>)}
        </div>
      ))}
      {p.about_me && <div className="card"><h4>About</h4><p>{p.about_me}</p></div>}
      {p.testimony && <div className="card"><h4>Testimony</h4><p>{p.testimony}</p></div>}

      <div className="card">
        <h4>Activity</h4>
        <p className="muted">Interests sent {ac.interests_sent} · received {ac.interests_received} · shortlisted by {ac.shortlisted_by} · messages sent {ac.messages_sent}</p>
        <p className={ac.open_reports_against ? "" : "muted"}>Escalations against: {ac.reports_against} ({ac.open_reports_against} open)</p>
      </div>

      <div className="card">
        <h4>History</h4>
        {d.history.length === 0 && <p className="muted">No admin actions yet.</p>}
        {d.history.map((h) => (
          <p key={h.id} className="muted">{when(h.created_at)} · <strong>{h.action}</strong>{h.meta?.notes ? ` · “${h.meta.notes}”` : ""} · by {h.actor_id ?? "—"}</p>
        ))}
      </div>
    </div>
  );
}
