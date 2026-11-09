"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";

export default function SettingsTab({ user }) {
  const { logout } = useAuth();
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [msg, setMsg] = useState({ t: "", ok: true });
  const change = async (e) => {
    e.preventDefault();
    try {
      const r = await api("/auth/password/change", { method: "POST", body: pw });
      setMsg({ t: r.message || "Password changed. Please log in again.", ok: true }); setPw({ current_password: "", new_password: "" });
      setTimeout(async () => { await logout(); window.location.href = "/login"; }, 1500);  // server invalidates the old token on change
    }
    catch (x) { setMsg({ t: x.message, ok: false }); }
  };
  return (
    <div className="narrow-wide">
      <div className="card">
        <h4>Profile approval</h4>
        <p>
          Mode: <span className={`badge ${user.approval_required ? "approved" : "pending"}`}>{user.approval_required ? "Approval required" : "Open access"}</span>
        </p>
        <p className="muted">
          {user.approval_required
            ? "Profiles and photos stay hidden from other members until you approve them."
            : "Members can search, chat and show photos right after creating a profile. Rejecting a profile still hides it."}
        </p>
        <p className="muted">Change this with <code>REQUIRE_APPROVAL</code> in <code>backend/.env</code>, then restart the backend.</p>
      </div>
      <div className="card">
        <h4>Your admin account</h4>
        <p>Email: {user.email || user.phone}</p>
        <p className="muted">Every admin currently has full access.</p>
        <form onSubmit={change} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          {msg.t && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
          <input type="password" placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
          <input type="password" placeholder="New password (min 8)" minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
          <button className="btn small">Change password</button>
        </form>
      </div>
    </div>
  );
}
