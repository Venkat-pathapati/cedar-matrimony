"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const opt = (...v) => v.map((x) => [x, x.replace(/_/g, " ")]);
// [key, label, type, options, only]   only: "create" = shown when adding a member, not when editing
const FIELDS = [
  ["Account", [
    ["phone", "Phone (10 digits)", "text", null, "account"], ["email", "Email (member login)", "email", null, "account"],
    ["password", "Password (min 8)", "password", null, "create"],
    ["plan", "Plan", "select", opt("free", "silver", "gold", "platinum"), "create"], ["months", "Plan months", "number", null, "create"],
    ["approval_status", "Review status", "select", opt("approved", "pending", "changes_requested", "rejected")],
  ]],
  ["Personal", [
    ["registering_for", "Profile for", "select", opt("Self", "Son", "Daughter", "Brother", "Sister", "Relative")],
    ["first_name", "First name", "text"], ["last_name", "Last name", "text"], ["gender", "Gender", "select", opt("male", "female")],
    ["date_of_birth", "Date of birth", "date"], ["height_cm", "Height (cm)", "number"],
    ["marital_status", "Marital status", "select", opt("never_married", "divorced", "widowed", "awaiting_divorce", "annulled")],
    ["physical_status", "Physical status", "select", opt("normal", "physically_challenged")], ["mother_tongue", "Mother tongue", "text"],
  ]],
  ["Faith", [
    ["denomination", "Denomination", "text"], ["church_name", "Church name", "text"], ["church_location", "Church location", "text"],
    ["baptism_status", "Baptism", "select", opt("baptized", "not_baptized")], ["pastor_name", "Pastor name", "text"], ["pastor_phone", "Pastor phone", "text"],
    ["egf_member", "EGF member", "select", opt("yes", "no")], ["egf_details", "EGF details", "text"],
  ]],
  ["Location", [["country", "Country", "text"], ["state", "State", "text"], ["district", "District", "text"], ["city", "City", "text"]]],
  ["Education & work", [["education", "Education", "text"], ["occupation", "Occupation", "text"], ["organization", "Organization", "text"], ["annual_income", "Annual income", "text"]]],
  ["Family & lifestyle", [
    ["father_occupation", "Father's occupation", "text"], ["mother_occupation", "Mother's occupation", "text"], ["siblings", "Siblings", "number"],
    ["eating_habit", "Eating", "select", opt("vegetarian", "non_vegetarian", "eggetarian", "vegan")],
    ["smoking_habit", "Smoking", "select", opt("no", "yes", "occasionally")], ["drinking_habit", "Drinking", "select", opt("no", "yes", "occasionally")],
    ["hobbies", "Hobbies", "text"], ["fitness", "Fitness", "text"], ["interests", "Interests (comma separated)", "text"],
  ]],
  ["Partner preferences", [
    ["pref_age_min", "Age from", "number"], ["pref_age_max", "Age to", "number"], ["pref_education", "Education", "text"],
    ["pref_location", "Location", "text"], ["pref_qualities", "Qualities", "text"],
  ]],
];
const BLANK = { registering_for: "Self", country: "India", mother_tongue: "Telugu", marital_status: "never_married", physical_status: "normal", plan: "free", months: 3, approval_status: "approved", gender: "male" };
const NUM = new Set(["height_cm", "siblings", "months", "pref_age_min", "pref_age_max"]);
const REQUIRED_ALWAYS = ["first_name", "last_name", "date_of_birth"];

// Add (memberId empty) or edit one member. Opens as a centered modal popup.
export default function MemberForm({ memberId, onClose, onSaved }) {
  const edit = !!memberId;
  const [v, setV] = useState(edit ? null : BLANK);
  const [noAccount, setNoAccount] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!edit) return;
    api(`/admin/members/${memberId}`).then((d) => {
      setNoAccount(!d.account.has_account);
      setV({ ...d.profile, interests: (d.profile.interests || []).join(", "), phone: d.account.phone || "", email: d.account.email || "", approval_status: d.approval_status });
    }).catch((e) => setMsg(e.message));
  }, [edit, memberId]);

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const hidden = ([, , , , only]) => (only === "create" && edit) || (only === "account" && noAccount);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const body = {};
    FIELDS.forEach(([, fs]) => fs.forEach((f) => {
      const [k] = f;
      if (hidden(f)) return;
      const x = v[k];
      body[k] = x === "" || x == null ? null : NUM.has(k) ? Number(x) : x;
    }));
    body.testimony = v.testimony || null;
    body.about_me = v.about_me || null;
    if (!edit) body.password = v.password || "";
    try {
      const r = await api(edit ? `/admin/members/${memberId}` : "/admin/members", { method: edit ? "PUT" : "POST", body });
      onSaved?.(r.member_id || memberId);
      onClose();
    } catch (err) { setMsg(err.message); setBusy(false); }
  };

  return (
    <div className="drawer-wrap modal-wrap" style={{ zIndex: 60 }}>
      <div className="drawer-backdrop" onClick={onClose} />
      <form className="drawer modal-box" onSubmit={submit}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>{edit ? `Edit ${memberId}` : "Add member"}</h3>
          <button type="button" className="btn small ghost" onClick={onClose}>✕ Close</button>
        </div>
        {msg && <div className="msg err">{msg}</div>}
        {noAccount && <div className="msg">Sample profile (no login account): phone, email and plan do not apply.</div>}
        {!v ? <p>Loading…</p> : <>
          {FIELDS.map(([title, fs]) => {
            const shown = fs.filter((f) => !hidden(f));
            if (!shown.length) return null;
            return (
              <div className="card" key={title}>
                <h4>{title}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {shown.map(([k, l, type, options]) => (
                    <div key={k}>
                      <label>{l}</label>
                      {type === "select"
                        ? <select value={v[k] ?? ""} onChange={set(k)}>{!BLANK[k] && <option value="">—</option>}{options.map(([o, t]) => <option key={o} value={o}>{t}</option>)}</select>
                        : <input type={type} value={v[k] ?? ""} onChange={set(k)} required={REQUIRED_ALWAYS.includes(k) || (!edit && ["phone", "email", "password"].includes(k)) } />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="card"><h4>About</h4><textarea value={v.about_me ?? ""} onChange={set("about_me")} maxLength={2000} /></div>
          <div className="card"><h4>Testimony</h4><textarea value={v.testimony ?? ""} onChange={set("testimony")} maxLength={3000} /></div>
          <div className="row"><button className="btn small" disabled={busy}>{busy ? "Saving…" : edit ? "Save changes" : "Create member"}</button></div>
        </>}
      </form>
    </div>
  );
}
