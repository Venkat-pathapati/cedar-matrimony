"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Photo from "@/components/Photo";
import { fmtDateTimeIST } from "@/lib/ist";

export function PhotosTab({ onOpen, onChanged, refreshKey }) {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ t: "", ok: true });
  const load = useCallback(() => api("/admin/photos", { params: { status } }).then(setRows).catch((e) => setMsg({ t: e.message, ok: false })), [status]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const act = async (id, verb) => {
    try { await api(`/admin/photos/${id}/${verb}`, { method: "POST", body: {} }); load(); onChanged(); }
    catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  const del = async (id) => {
    if (!confirm("Delete this photo permanently?")) return;
    try { await api(`/admin/photos/${id}`, { method: "DELETE" }); load(); onChanged(); }
    catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  return (
    <>
      <div className="tabs">{["pending", "approved", "rejected"].map((s) => <button key={s} className={`tab ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>{s}</button>)}</div>
      {msg.t && <div className="msg err">{msg.t}</div>}
      {rows.length === 0 && <p className="muted">No {status} photos.</p>}
      <div className="grid">
        {rows.map((ph) => (
          <div className="card" key={ph.id}>
            <Photo id={ph.id} size={200} />
            <p><button className="link" onClick={() => ph.member_id && onOpen(ph.member_id)}>{ph.name ? `${ph.name} · ` : ""}{ph.member_id || `user ${ph.user_id}`}</button> <span className="muted">{new Date(ph.created_at).toLocaleDateString()}</span></p>
            <div className="row">
              <button className="btn small" disabled={status === "approved"} onClick={() => act(ph.id, "approve")}>Approve</button>
              <button className="btn small danger" disabled={status === "rejected"} onClick={() => act(ph.id, "reject")}>Reject</button>
              <button className="btn small ghost" onClick={() => del(ph.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ReportsTab({ onOpen, onChanged, refreshKey }) {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ t: "", ok: true });
  const load = useCallback(() => api("/admin/reports", { params: { status } }).then(setRows).catch((e) => setMsg({ t: e.message, ok: false })), [status]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const act = async (path) => {
    try { const r = await api(path, { method: "POST", body: {} }); setMsg({ t: r.message, ok: true }); load(); onChanged(); }
    catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  const del = async (id) => {
    if (!confirm("Delete this escalation permanently?")) return;
    try { const r = await api(`/admin/reports/${id}`, { method: "DELETE" }); setMsg({ t: r.message, ok: true }); load(); onChanged(); }
    catch (e) { setMsg({ t: e.message, ok: false }); }
  };
  return (
    <>
      <div className="tabs">{["open", "resolved"].map((s) => <button key={s} className={`tab ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>{s}</button>)}</div>
      {msg.t && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {rows.length === 0 && <p className="muted">No {status} escalations.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row between">
            <strong>{r.reason}</strong><span className="muted">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <p>Escalated: <button className="link" onClick={() => r.target_member_id && onOpen(r.target_member_id)}>{r.target_name || `user ${r.target_user_id}`} {r.target_member_id}</button>
            {r.target_status && r.target_status !== "active" && <span className="badge rejected" style={{ marginLeft: 6 }}>{r.target_status}</span>}
            <span className="muted"> · by {r.reporter_member_id || `user ${r.reporter_user_id}`}</span></p>
          {r.details && <p className="muted">{r.details}</p>}
          <div className="row">
            {status === "open" && <>
              <button className="btn small" onClick={() => act(`/admin/reports/${r.id}/resolve`)}>Mark resolved</button>
              <button className="btn small danger" onClick={() => { if (confirm("Suspend the reported member?")) act(`/admin/users/${r.target_user_id}/suspend`); }}>Suspend member</button>
            </>}
            <button className="btn small ghost" onClick={() => del(r.id)}>Delete escalation</button>
          </div>
        </div>
      ))}
    </>
  );
}

export function AuditTab() {
  const [f, setF] = useState({ action: "", target_id: "" });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const load = useCallback(() => api("/admin/audit", { params: { ...f, page, size: 50 } }).then(setRows).catch((e) => setErr(e.message)), [f, page]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <div className="row filters">
        <select value={f.action} onChange={(e) => { setF({ ...f, action: e.target.value }); setPage(1); }} style={{ width: 170 }}>
          <option value="">All actions</option>
          {["profile.", "photo.", "user.", "plan.", "report.", "password.", "account."].map((a) => <option key={a} value={a}>{a}*</option>)}
        </select>
        <input placeholder="Target ID (e.g. TCM000001 or user id)" value={f.target_id} onChange={(e) => { setF({ ...f, target_id: e.target.value }); setPage(1); }} style={{ flex: 1, minWidth: 200 }} />
      </div>
      {err && <div className="msg err">{err}</div>}
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="muted">No records.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="muted">{new Date(a.created_at).toLocaleString()}</td><td>{a.actor_id ?? "—"}</td><td><strong>{a.action}</strong></td>
                <td>{a.target_type} {a.target_id}</td><td className="muted">{a.meta ? JSON.stringify(a.meta) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row pager" style={{ marginTop: 12 }}>
        <button className="btn small ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
        <span className="muted">Page {page}</span>
        <button className="btn small ghost" disabled={rows.length < 50} onClick={() => setPage(page + 1)}>Older →</button>
      </div>
    </>
  );
}

export function EnquiriesTab() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, items: [] });
  const [err, setErr] = useState("");
  const size = 30;
  const load = useCallback(() => api("/admin/enquiries", { params: { page, size } }).then(setData).catch((e) => setErr(e.message)), [page]);
  useEffect(() => { load(); }, [load]);
  const del = async (id) => {
    if (!confirm("Delete this enquiry?")) return;
    try { await api(`/admin/enquiries/${id}`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };
  const pages = Math.max(1, Math.ceil(data.total / size));
  return (
    <>
      {err && <div className="msg err">{err}</div>}
      <p className="muted">{data.total} message{data.total === 1 ? "" : "s"} sent from the website contact form</p>
      {data.items.length === 0 && <p className="muted">No enquiries yet.</p>}
      {data.items.map((m) => (
        <div className="card" key={m.id}>
          <div className="row between">
            <strong>{m.name}{m.subject ? ` · ${m.subject}` : ""}</strong>
            <span className="muted">{fmtDateTimeIST(m.created_at)}</span>
          </div>
          <p className="muted"><a href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
          <button className="btn small danger" onClick={() => del(m.id)}>Delete</button>
        </div>
      ))}
      <div className="row pager" style={{ marginTop: 12 }}>
        <button className="btn small ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <span className="muted">Page {page} of {pages}</span>
        <button className="btn small ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </>
  );
}
