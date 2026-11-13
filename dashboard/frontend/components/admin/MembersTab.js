"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import MemberForm from "@/components/admin/MemberForm";
import ConfirmModal from "@/components/ConfirmModal";
import Photo from "@/components/Photo";
import { fmtDateIST, fmtDateTimeIST } from "@/lib/ist";

const QUICK = [["pending", "Needs review"], ["changes_requested", "Changes requested"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All"]];

export default function MembersTab({ filter, onOpen, refreshKey }) {
  const [f, setF] = useState({ status: "pending", user_status: "", gender: "", plan: "", q: "", ...filter, add: undefined });
  const [q, setQ] = useState(filter?.q || "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, items: [] });
  const [err, setErr] = useState("");
  const [form, setForm] = useState(filter?.add ? "" : null); // null | "" (add) | member id (edit)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const size = 20;

  const load = useCallback(() => {
    setErr("");
    api("/admin/members", { params: { ...f, page, size } }).then(setData).catch((e) => setErr(e.message));
  }, [f, page]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { if (filter) { setF((cur) => ({ ...cur, status: "", user_status: "", plan: "", ...filter, add: undefined })); setQ(filter.q || ""); setPage(1); } }, [filter]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const pages = Math.max(1, Math.ceil(data.total / size));
  const remove = async (m) => {
    setDeleteTarget(null);
    try { await api(`/admin/members/${m.member_id}`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="tabs">
        {QUICK.map(([v, l]) => <button key={l} className={`tab ${f.status === v && !f.user_status ? "active" : ""}`} onClick={() => { setF({ ...f, status: v, user_status: "" }); setPage(1); }}>{l}</button>)}
      </div>
      <form className="row filters" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q }); setPage(1); }}>
        <input placeholder="Search member ID (CM000012), name, church, city, phone, email" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={f.plan} onChange={set("plan")} style={{ width: 120 }}><option value="">Any plan</option><option>free</option><option>silver</option><option>gold</option><option>platinum</option></select>
        <select value={f.user_status} onChange={set("user_status")} style={{ width: 150 }}><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select>
        <button className="btn small">Search</button>
        <button type="button" className="btn small ghost" onClick={() => setForm("")}>+ Add member</button>
      </form>
      {form !== null && <MemberForm memberId={form} onClose={() => setForm(null)} onSaved={load} />}
      {err && <div className="msg err">{err}</div>}
      <p className="muted">{data.total} member{data.total === 1 ? "" : "s"}</p>
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Church</th><th>Review</th><th>Status</th><th>Plan</th><th>Joined</th><th>Modified (IST)</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={11} className="muted">Nothing matches these filters.</td></tr>}
            {data.items.map((m) => (
              <tr key={m.member_id} onClick={() => onOpen(m.member_id)} className="clickable">
                <td><strong>{m.member_id}</strong></td>
                <td><span className="who"><Photo id={m.photo_id} url={m.photo_url} size={32} alt={m.name} />{m.name}</span>{!m.has_account && <div className="muted">sample profile</div>}</td>
                <td>{m.phone || "—"}</td><td>{m.email || "—"}</td>
                <td>{m.church_name || m.denomination || "—"}</td>
                <td><span className={`badge ${m.approval_status}`}>{m.approval_status.replace("_", " ")}</span></td>
                <td><span className={`badge ${m.user_status === "active" ? "approved" : "rejected"}`}>{m.user_status}</span>{m.is_hidden && <div className="muted">hidden</div>}</td>
                <td>{m.plan}</td>
                <td className="muted">{fmtDateIST(m.created_at)}</td>
                <td className="muted">{fmtDateTimeIST(m.updated_at)}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                  <button className="btn small ghost" onClick={() => setForm(m.member_id)}>Edit</button>{" "}
                  <button className="btn small danger" onClick={() => setDeleteTarget(m)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row pager" style={{ marginTop: 12 }}>
        <button className="btn small ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <span className="muted">Page {page} of {pages}</span>
        <button className="btn small ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
      {deleteTarget && (
        <ConfirmModal
          title="Delete Member"
          message={`Delete ${deleteTarget.name} (${deleteTarget.member_id}) permanently? Their photos, interests and chats are removed too.`}
          confirmText="Delete"
          cancelText="Cancel"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget)}
        />
      )}
    </>
  );
}