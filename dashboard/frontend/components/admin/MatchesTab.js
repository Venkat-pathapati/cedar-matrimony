"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

export default function MatchesTab({ onOpen, refreshKey }) {
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const size = 20;
  const load = useCallback(() => api("/admin/matches", { params: { page, size } }).then(setData).catch((e) => setErr(e.message)), [page]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const remove = async (id) => {
    setDeleteTarget(null);
    try { await api(`/admin/matches/${id}`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };
  const pages = Math.max(1, Math.ceil(data.total / size));
  const who = (m) => <button className="link-plain" onClick={() => onOpen(m.member_id)}>{m.name} <span className="muted">{m.member_id}</span></button>;
  return (
    <>
      <p className="muted">A like is an interest that the other member accepted. {data.total} so far.</p>
      {err && <div className="msg err">{err}</div>}
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>Sent by</th><th>Accepted by</th><th>Liked on</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={4} className="muted">No likes yet.</td></tr>}
            {data.items.map((m) => <tr key={m.id}><td>{who(m.sender)}</td><td>{who(m.receiver)}</td><td className="muted">{new Date(m.matched_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td><td><button className="btn small danger" onClick={() => setDeleteTarget(m.id)}>Remove</button></td></tr>)}
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
          title="Remove Like"
          message="Remove this like? The accepted interest is deleted."
          confirmText="Remove"
          cancelText="Cancel"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => remove(deleteTarget)}
        />
      )}
    </>
  );
}
