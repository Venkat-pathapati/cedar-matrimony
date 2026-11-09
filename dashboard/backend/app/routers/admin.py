"""Admin dashboard API (served on port 8001 by app/admin_main.py).

It runs on the SAME database and upload folder as the website (port 8000), so every member, detail and photo
the website collects shows up in the dashboard immediately, and every edit / approval made in the dashboard
is what the website uses. Response shapes match what the dashboard frontend (port 3001) expects.
"""
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..emailer import notify_member
from ..models import (AuditLog, ContactMessage, Interest, Message, Photo, Profile, Report, Shortlist, User)
from ..security import create_token, current_user, hash_password, require_admin, verify_password

PLAN_NAMES = ["Free", "Silver", "Gold", "Platinum"]
STATUSES = ("pending", "approved", "rejected", "changes_requested")

# --------------------------------------------------------------------------------------------------
# /api/v1/auth  (admin sign-in, used by the dashboard login page)
# --------------------------------------------------------------------------------------------------
auth_router = APIRouter(prefix="/api/v1", tags=["admin-auth"])


def _phone(v: str) -> str:
    v = v.strip().replace(" ", "").replace("-", "")
    if v.startswith("+91"):
        v = v[3:]
    if not (v.isdigit() and len(v) == 10):
        raise ValueError("Enter a valid 10-digit mobile number")
    return v


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    username: str = Field(min_length=3, max_length=255)  # email or 10-digit mobile
    password: str


def _me(u: User) -> dict:
    p = u.profile
    return {"id": u.id, "phone": u.phone or "", "email": u.email, "role": "admin" if u.is_admin else "user",
            "profile_for": (p.registering_for if p else None) or "Self", "plan": u.effective_plan.lower(),
            "member_id": p.member_id if p else None, "approval_status": p.approval_status if p else None,
            "approval_required": True}  # the website only shows profiles an admin has approved


@auth_router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    name = body.username.strip()
    user = None
    if "@" in name:
        user = db.scalar(select(User).where(User.email == name.lower()))
    else:
        try:
            user = db.scalar(select(User).where(User.phone == _phone(name)))
        except ValueError:
            user = None
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_admin:
        raise HTTPException(403, "This login is for administrators only.")
    if user.status == "suspended":
        raise HTTPException(403, "Account suspended")
    return {"access_token": create_token(user.id, settings.admin_token_minutes), "token_type": "bearer"}


@auth_router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return _me(user)


@auth_router.post("/auth/logout")
def logout(_: User = Depends(current_user)):
    return {"message": "Logged out"}  # tokens are stateless and short-lived (ADMIN_TOKEN_MINUTES); the browser drops it


@auth_router.post("/auth/password/change")
def change_password(body: PasswordChangeIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    _audit(db, user, "password.change", "user", user.id)
    db.commit()
    return {"message": "Password changed. Please log in again."}


@auth_router.get("/chat/unread-count")
def unread_count(_: User = Depends(current_user)):
    """The dashboard's shell polls this; member chat is not part of the admin console, so it is always 0."""
    return {"unread": 0}


@auth_router.get("/photos/{photo_id}/file")
def photo_file(photo_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admins can open any uploaded photo (including pending and rejected ones)."""
    ph = db.get(Photo, photo_id)
    path = Path(settings.upload_dir) / ph.filename if ph else None
    if not ph or not path.exists():
        raise HTTPException(404, "Photo not found")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"})


@auth_router.get("/health")
def health():
    return {"status": "ok", "service": "admin"}


# --------------------------------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------------------------------
def _aware(d: datetime | None) -> datetime | None:
    """The database stores naive UTC datetimes; send them out as UTC so the browser shows IST correctly."""
    return d if d is None or d.tzinfo else d.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _age(dob: date | None, fallback: int | None = None) -> int | None:
    if not dob:
        return fallback or None
    t = date.today()
    return t.year - dob.year - ((t.month, t.day) < (dob.month, dob.day))


def _audit(db: Session, admin: User | None, action: str, target_type: str | None = None, target_id=None, **meta):
    db.add(AuditLog(actor_id=admin.id if admin else None, action=action, target_type=target_type,
                    target_id=None if target_id is None else str(target_id),
                    meta=json.dumps(meta, default=str) if meta else None))


def _meta(raw: str | None):
    try:
        return json.loads(raw) if raw else None
    except ValueError:
        return None


def _by_member_id(db: Session, member_id: str) -> Profile:
    mid = member_id.strip().upper()
    p = db.get(Profile, int(mid[2:])) if mid.startswith("CM") and mid[2:].isdigit() else None
    if not p:
        raise HTTPException(404, "Profile not found")
    return p


def _name(p: Profile) -> str:
    return p.name or " ".join(x for x in (p.first_name, p.last_name) if x) or "Member"


def _photos(p: Profile) -> list[Photo]:
    return sorted(p.user.photos, key=lambda x: x.position) if p.user else []


def _main_photo_id(p: Profile) -> int | None:
    ph = _photos(p)
    return ph[0].id if ph else None


def _plan(p: Profile) -> str:
    return p.user.effective_plan.lower() if p.user else "free"


def _row(p: Profile) -> dict:
    u = p.user
    ph = _photos(p)
    return {"member_id": p.member_id, "user_id": u.id if u else None, "name": _name(p), "gender": p.gender,
            "age": _age(p.dob, p.age), "phone": u.phone if u else None, "email": u.email if u else None,
            "denomination": p.denomination or None, "church_name": p.church_name, "district": p.district, "city": p.city or None,
            "approval_status": p.approval_status, "user_status": u.status if u else "active", "plan": _plan(p),
            "is_hidden": bool(p.is_hidden), "photos": len(ph), "photos_pending": sum(1 for x in ph if x.status == "pending"),
            "photo_id": ph[0].id if ph else None, "photo_url": p.photo_url,
            "has_account": u is not None,
            "created_at": _aware(p.created_at), "updated_at": _aware(p.updated_at)}


def _fields(p: Profile) -> dict:
    """Every profile detail, under the names the dashboard form uses."""
    return {
        "registering_for": p.registering_for or "Self", "first_name": p.first_name, "last_name": p.last_name,
        "gender": p.gender or None, "date_of_birth": p.dob, "height_cm": p.height_cm, "marital_status": p.marital_status,
        "physical_status": p.physical_status, "mother_tongue": p.mother_tongue,
        "denomination": p.denomination or None, "church_name": p.church_name, "church_location": p.church_location,
        "baptism_status": p.baptism_status, "pastor_name": p.pastor_name, "pastor_phone": p.pastor_phone,
        "egf_member": p.egf_member, "egf_details": p.egf_details, "testimony": p.testimony,
        "country": p.country, "state": p.state, "district": p.district, "city": p.city or None,
        "education": p.education or None, "occupation": p.profession or None, "organization": p.organization,
        "annual_income": p.annual_income, "father_occupation": p.father_occupation, "mother_occupation": p.mother_occupation,
        "siblings": p.siblings, "eating_habit": p.eating_habit, "smoking_habit": p.smoking_habit, "drinking_habit": p.drinking_habit,
        "hobbies": p.hobbies, "fitness": p.fitness, "interests": p.interests or [],
        "pref_age_min": p.pref_age_min, "pref_age_max": p.pref_age_max, "pref_education": p.pref_education,
        "pref_location": p.pref_location, "pref_qualities": p.pref_qualities,
        "about_me": p.about or None,
    }


def _location(p: Profile) -> str:
    return ", ".join(x for x in (p.city or p.district, p.state, p.country if p.country and p.country != "India" else None) if x)


def _notify(bg: BackgroundTasks, user: User | None, subject: str, headline: str, *lines: str):
    """Email the member in the background (silently skipped when SMTP is not configured or there is no account)."""
    if user and user.email:
        bg.add_task(notify_member, user.email, subject, headline, " ".join(lines), "/profile", "Open Cedar Matrimony")


def _need_account(p: Profile) -> User:
    if not p.user:
        raise HTTPException(400, "This is a sample profile without a login account, so this action does not apply.")
    return p.user


# --------------------------------------------------------------------------------------------------
# /api/v1/admin
# --------------------------------------------------------------------------------------------------
router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    count = lambda stmt: db.scalar(stmt) or 0  # noqa: E731
    prof = lambda *w: count(select(func.count(Profile.id)).where(*w))  # noqa: E731
    return {
        "users": prof(),
        "profiles_pending": prof(Profile.approval_status == "pending"),
        "profiles_approved": prof(Profile.approval_status == "approved"),
        "profiles_changes_requested": prof(Profile.approval_status == "changes_requested"),
        "profiles_rejected": prof(Profile.approval_status == "rejected"),
        "interests_sent": count(select(func.count(Interest.id))),
        "interests_accepted": count(select(func.count(Interest.id)).where(Interest.status == "accepted")),
        "paid_members": count(select(func.count(User.id)).where(User.is_admin.is_(False), User.plan != "Free")),
        "open_reports": count(select(func.count(Report.id)).where(Report.status == "open")),
        "photos_pending": count(select(func.count(Photo.id)).where(Photo.status == "pending")),
        "messages": count(select(func.count(Message.id))),
        "suspended_users": count(select(func.count(User.id)).where(User.status == "suspended")),
        "deactivated_users": count(select(func.count(User.id)).where(User.status == "deactivated")),
        "signups_last_7_days": prof(Profile.created_at >= datetime.utcnow() - timedelta(days=7)),
        "enquiries": count(select(func.count(ContactMessage.id))),
    }


def _pct_change(current: int, previous: int):
    return None if previous <= 0 else round((current - previous) * 100 / previous)


def _add_months(d: datetime, n: int) -> datetime:
    m = d.month - 1 + n
    return d.replace(year=d.year + m // 12, month=m % 12 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("/dashboard")
def dashboard(months: int = Query(6, ge=3, le=12), db: Session = Depends(get_db)):
    """Everything the dashboard home needs in one call."""
    t = _now()
    d30, d60 = t - timedelta(days=30), t - timedelta(days=60)
    signups = [_aware(c) or t for c in db.scalars(select(Profile.created_at)).all()]
    accepted = [_aware(i.responded_at or i.created_at) for i in db.scalars(select(Interest).where(Interest.status == "accepted")).all()]
    total, total_prev = len(signups), sum(1 for c in signups if c <= d30)
    reg30, reg_prev = sum(1 for c in signups if c > d30), sum(1 for c in signups if d60 < c <= d30)
    match_total, match_prev = len(accepted), sum(1 for c in accepted if c <= d30)

    first = _add_months(t, -(months - 1))
    growth = []
    for i in range(months):
        start, end = _add_months(first, i), _add_months(first, i + 1)
        growth.append({"label": start.strftime("%b"), "total": sum(1 for c in signups if c < end)})

    gender = {g: db.scalar(select(func.count(Profile.id)).where(Profile.gender == g)) or 0 for g in ("male", "female")}

    recent = db.scalars(select(Profile).order_by(Profile.created_at.desc(), Profile.id.desc()).limit(6)).all()
    recent_members = [{**_row(p), "location": _location(p)} for p in recent]

    feed = []
    for p in db.scalars(select(Profile).order_by(Profile.created_at.desc(), Profile.id.desc()).limit(8)).all():
        feed.append({"at": _aware(p.created_at) or t, "name": _name(p), "member_id": p.member_id, "text": "New registration", "kind": "signup"})
    ACT = {"profile.approved": ("Profile approved", "approve"), "profile.rejected": ("Profile rejected", "reject"),
           "profile.changes_requested": ("Changes requested", "changes"), "photo.approved": ("Photo approved", "approve"),
           "photo.rejected": ("Photo rejected", "reject"), "photo.delete": ("Photo deleted", "other"),
           "member.create": ("Member added by admin", "signup"), "member.edit": ("Details edited by admin", "changes"),
           "user.suspend": ("Account suspended", "reject"), "user.reactivate": ("Account reactivated", "approve"),
           "plan.grant": ("Plan granted", "approve"), "report.resolve": ("Escalation resolved", "approve")}
    for a in db.scalars(select(AuditLog).where(AuditLog.action.in_(list(ACT))).order_by(AuditLog.id.desc()).limit(25)).all():
        text, kind = ACT[a.action]
        m = _meta(a.meta) or {}
        p = None
        if a.target_type == "profile" and a.target_id:
            p = _try_member(db, a.target_id)
        elif a.target_type == "photo":
            uid = m.get("user_id")
            p = db.scalar(select(Profile).where(Profile.user_id == uid)) if uid else None
        elif a.target_type == "user" and a.target_id and a.target_id.isdigit():
            p = db.scalar(select(Profile).where(Profile.user_id == int(a.target_id)))
        elif a.action == "report.resolve" and m.get("target_profile_id"):
            p = db.get(Profile, m["target_profile_id"])
        if p:
            feed.append({"at": _aware(a.created_at), "name": _name(p), "member_id": p.member_id, "text": text, "kind": kind})
    for i in db.scalars(select(Interest).order_by(Interest.id.desc()).limit(8)).all():
        sp = db.get(Profile, i.from_profile_id)
        if sp:
            feed.append({"at": _aware(i.created_at), "name": _name(sp), "member_id": sp.member_id, "text": "Sent a match request", "kind": "interest"})
    feed.sort(key=lambda x: x["at"], reverse=True)

    return {
        "total_members": {"value": total, "change": _pct_change(total, total_prev)},
        "active_matches": {"value": match_total, "change": _pct_change(match_total, match_prev)},
        "new_registrations": {"value": reg30, "change": _pct_change(reg30, reg_prev)},
        "pending_review": db.scalar(select(func.count(Profile.id)).where(Profile.approval_status == "pending")) or 0,
        "photos_pending": db.scalar(select(func.count(Photo.id)).where(Photo.status == "pending")) or 0,
        "open_reports": db.scalar(select(func.count(Report.id)).where(Report.status == "open")) or 0,
        "enquiries": db.scalar(select(func.count(ContactMessage.id))) or 0,
        "growth": growth, "gender": gender, "recent_members": recent_members, "activities": feed[:8],
    }


def _try_member(db: Session, member_id: str) -> Profile | None:
    try:
        return _by_member_id(db, member_id)
    except HTTPException:
        return None


# ---- matches --------------------------------------------------------------------------------------
@router.get("/matches")
def matches(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Accepted interests = matches. Both members are returned so the admin can open either profile."""
    base = select(Interest).where(Interest.status == "accepted")
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Interest.responded_at.desc(), Interest.id.desc()).offset((page - 1) * size).limit(size)).all()
    out = []
    for i in rows:
        a, b = db.get(Profile, i.from_profile_id), db.get(Profile, i.to_profile_id)
        if a and b:
            out.append({"id": i.id, "sender": {"member_id": a.member_id, "name": _name(a)},
                        "receiver": {"member_id": b.member_id, "name": _name(b)},
                        "matched_at": _aware(i.responded_at or i.created_at)})
    return {"total": total, "page": page, "size": size, "items": out}


@router.delete("/matches/{interest_id}")
def delete_match(interest_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    i = db.get(Interest, interest_id)
    if not i:
        raise HTTPException(404, "Match not found")
    db.delete(i)
    _audit(db, admin, "match.delete", "interest", interest_id)
    db.commit()
    return {"message": "Match removed"}


# ---- review: approve / reject / request changes ---------------------------------------------------
class AdminDecision(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)


@router.get("/profiles")
def list_profiles(status: str = "pending", page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    rows = db.scalars(select(Profile).where(Profile.approval_status == status).order_by(Profile.created_at)
                      .offset((max(page, 1) - 1) * size).limit(size)).all()
    return [{"member_id": p.member_id, "user_id": p.user_id, "name": _name(p), "gender": p.gender, "dob": p.dob,
             "phone": p.user.phone if p.user else None, "denomination": p.denomination or None, "church_name": p.church_name,
             "church_location": p.church_location, "baptism_status": p.baptism_status, "pastor_name": p.pastor_name,
             "pastor_phone": p.pastor_phone, "approval_status": p.approval_status, "admin_notes": p.admin_notes,
             "user_status": p.user.status if p.user else "active", "photos": len(_photos(p))} for p in rows]


MAIL = {
    "approved": ("Your profile is approved", "Your profile has been approved and is now visible to other members."),
    "rejected": ("Your profile was not approved", "Your profile could not be approved."),
    "changes_requested": ("Changes needed on your profile", "Our team has asked for a few changes to your profile."),
}


def _decide(db: Session, bg: BackgroundTasks, admin: User, member_id: str, status: str, notes: str | None):
    p = _by_member_id(db, member_id)
    before = p.approval_status
    p.set_approval(status)
    p.admin_notes = notes
    _audit(db, admin, f"profile.{status}", "profile", p.member_id, **{"from": before, "notes": notes})
    db.commit()
    headline, line = MAIL[status]
    _notify(bg, p.user, f"Cedar Matrimony: {headline}", headline, line, f"Note from our team: {notes}" if notes else "")
    return {"message": f"{p.member_id} {status}"}


@router.post("/profiles/{member_id}/approve")
def approve(member_id: str, body: AdminDecision, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _decide(db, bg, admin, member_id, "approved", body.notes)


@router.post("/profiles/{member_id}/reject")
def reject(member_id: str, body: AdminDecision, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if not body.notes:
        raise HTTPException(400, "Give a reason so the member can fix the profile")
    return _decide(db, bg, admin, member_id, "rejected", body.notes)


@router.post("/profiles/{member_id}/request-changes")
def request_changes(member_id: str, body: AdminDecision, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Ask the member to fix specific things. When they save the profile again it goes back to the pending queue."""
    if not body.notes:
        raise HTTPException(400, "Tell the member what to change")
    return _decide(db, bg, admin, member_id, "changes_requested", body.notes)


# ---- photos ---------------------------------------------------------------------------------------
@router.get("/photos")
def list_photos(status: str = "pending", page: int = 1, size: int = 30, db: Session = Depends(get_db)):
    rows = db.scalars(select(Photo).where(Photo.status == status).order_by(Photo.created_at)
                      .offset((max(page, 1) - 1) * size).limit(size)).all()
    out = []
    for ph in rows:
        u = db.get(User, ph.user_id)
        out.append({"id": ph.id, "user_id": ph.user_id, "member_id": u.profile.member_id if u and u.profile else None,
                    "name": _name(u.profile) if u and u.profile else None, "status": ph.status, "created_at": _aware(ph.created_at)})
    return out


def _photo_decision(db: Session, bg: BackgroundTasks, admin: User, photo_id: int, status: str):
    ph = db.get(Photo, photo_id)
    if not ph:
        raise HTTPException(404, "Photo not found")
    ph.status = status
    _audit(db, admin, f"photo.{status}", "photo", ph.id, user_id=ph.user_id)
    db.commit()
    owner = db.get(User, ph.user_id)
    if status == "approved":
        _notify(bg, owner, "Cedar Matrimony: Your photo is approved", "Your photo has been approved",
                "Your profile photo has been approved and is visible on your profile.")
    else:
        _notify(bg, owner, "Cedar Matrimony: Your photo was not approved", "Your photo was not approved",
                "Your profile photo could not be approved. Please upload a clear, recent photo of yourself.")
    return {"message": f"Photo {ph.id} {status}"}


@router.post("/photos/{photo_id}/approve")
def approve_photo(photo_id: int, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _photo_decision(db, bg, admin, photo_id, "approved")


@router.post("/photos/{photo_id}/reject")
def reject_photo(photo_id: int, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _photo_decision(db, bg, admin, photo_id, "rejected")


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    ph = db.get(Photo, photo_id)
    if not ph:
        raise HTTPException(404, "Photo not found")
    name, uid = ph.filename, ph.user_id
    owner = db.get(User, uid)
    db.delete(ph)
    db.flush()
    if owner:
        db.refresh(owner)
        for i, x in enumerate(sorted(owner.photos, key=lambda z: z.position)):
            x.position = i  # keep the main photo at position 0
    _audit(db, admin, "photo.delete", "photo", photo_id, user_id=uid)
    db.commit()
    (Path(settings.upload_dir) / name).unlink(missing_ok=True)
    return {"message": "Photo deleted"}


# ---- audit log ------------------------------------------------------------------------------------
@router.get("/audit")
def audit_log(action: str | None = None, target_id: str | None = None, actor_id: int | None = None,
              page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    q = select(AuditLog)
    if action:
        q = q.where(AuditLog.action.like(f"{action}%"))
    if target_id:
        q = q.where(AuditLog.target_id == target_id.upper())
    if actor_id:
        q = q.where(AuditLog.actor_id == actor_id)
    rows = db.scalars(q.order_by(AuditLog.id.desc()).offset((page - 1) * size).limit(size)).all()
    return [{"id": r.id, "actor_id": r.actor_id, "action": r.action, "target_type": r.target_type, "target_id": r.target_id,
             "meta": _meta(r.meta), "created_at": _aware(r.created_at)} for r in rows]


# ---- reports (escalations) ------------------------------------------------------------------------
@router.get("/reports")
def list_reports(status: str = "open", db: Session = Depends(get_db)):
    rows = db.scalars(select(Report).where(Report.status == status).order_by(Report.created_at.desc())).all()
    out = []
    for r in rows:
        t, rp = db.get(Profile, r.target_profile_id), db.get(Profile, r.reporter_profile_id)
        out.append({"id": r.id, "target_user_id": t.user_id if t else None, "reporter_user_id": rp.user_id if rp else None,
                    "reason": r.reason, "details": r.details, "created_at": _aware(r.created_at),
                    "target_member_id": t.member_id if t else None, "target_name": _name(t) if t else None,
                    "target_status": (t.user.status if t and t.user else "active") if t else None,
                    "reporter_member_id": rp.member_id if rp else None})
    return out


@router.post("/reports/{report_id}/resolve")
def resolve_report(report_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    r = db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    r.status = "resolved"
    _audit(db, admin, "report.resolve", "report", r.id, target_profile_id=r.target_profile_id)
    db.commit()
    return {"message": "Report resolved"}


@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    r = db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    db.delete(r)
    _audit(db, admin, "report.delete", "report", report_id)
    db.commit()
    return {"message": "Report deleted"}


# ---- accounts: suspend / reactivate / plan ---------------------------------------------------------
@router.post("/users/{user_id}/suspend")
def suspend(user_id: int, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u or u.is_admin:
        raise HTTPException(404, "User not found")
    u.status = "suspended"  # the website refuses this account's token on the very next request
    _audit(db, admin, "user.suspend", "user", u.id)
    db.commit()
    _notify(bg, u, "Cedar Matrimony: Your account is suspended", "Your account has been suspended",
            "Your account has been suspended by our team. If you think this is a mistake, please contact us.")
    return {"message": "User suspended"}


@router.post("/users/{user_id}/reactivate")
def reactivate(user_id: int, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u.status = "active"
    _audit(db, admin, "user.reactivate", "user", u.id)
    db.commit()
    _notify(bg, u, "Cedar Matrimony: Your account is active again", "Your account is active again",
            "Your account has been reactivated. You can use Cedar Matrimony as usual.")
    return {"message": "User reactivated"}


class GrantPlanIn(BaseModel):
    plan: str
    months: int = Field(default=3, ge=1, le=24)

    @field_validator("plan")
    @classmethod
    def _plan(cls, v: str) -> str:
        v = v.strip().title()
        if v not in PLAN_NAMES:
            raise ValueError(f"Plan must be one of: {', '.join(n.lower() for n in PLAN_NAMES)}")
        return v


def _set_plan(u: User, plan: str, months: int) -> None:
    u.plan = plan
    u.plan_expires_at = None if plan == "Free" else datetime.utcnow() + timedelta(days=30 * months)


@router.post("/users/{user_id}/plan")
def grant_plan(user_id: int, body: GrantPlanIn, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Manual grant (plans are not paid online yet)."""
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    _set_plan(u, body.plan, body.months)
    _audit(db, admin, "plan.grant", "user", u.id, plan=body.plan.lower(), months=body.months)
    db.commit()
    detail = ("Your account is now on the Free plan." if body.plan == "Free"
              else f"Your {body.plan} plan is active for {body.months} month(s), valid until {u.plan_expires_at:%d %b %Y}.")
    _notify(bg, u, "Cedar Matrimony: Your plan was updated", "Your plan was updated", detail)
    return {"message": f"{body.plan.lower()} plan set"}


# ---- members: list / detail / create / edit / delete ----------------------------------------------
@router.get("/members")
def list_members(status: str | None = None, user_status: str | None = None, q: str | None = Query(None, max_length=60),
                 gender: str | None = None, plan: str | None = None, page: int = Query(1, ge=1),
                 size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Member table: filter by review status, account status, gender, plan; search name / member id / phone / email / church."""
    query = select(Profile).outerjoin(User, User.id == Profile.user_id)
    if status:
        query = query.where(Profile.approval_status == status)
    if user_status:
        cond = User.status == user_status
        query = query.where(or_(cond, and_(User.id.is_(None), user_status == "active")))
    if gender:
        query = query.where(Profile.gender == gender)
    if q:
        text = q.strip()
        like = f"%{text}%"
        conds = [Profile.name.ilike(like), Profile.church_name.ilike(like), Profile.denomination.ilike(like), Profile.city.ilike(like),
                 Profile.district.ilike(like), User.phone.like(like), User.email.ilike(like)]
        if text.upper().startswith("CM") and text[2:].isdigit():
            conds.append(Profile.id == int(text[2:]))
        query = query.where(or_(*conds))
    rows = db.scalars(query.order_by(Profile.created_at if status == "pending" else Profile.created_at.desc(),
                                     Profile.id if status == "pending" else Profile.id.desc())).all()
    if plan:
        rows = [p for p in rows if _plan(p) == plan.lower()]
    total = len(rows)
    return {"total": total, "page": page, "size": size, "items": [_row(p) for p in rows[(page - 1) * size: page * size]]}


@router.get("/members/{member_id}")
def member_detail(member_id: str, db: Session = Depends(get_db)):
    """Everything a reviewer needs on one screen: all profile fields, contact + pastor reference, photos, activity, history."""
    p = _by_member_id(db, member_id)
    u = p.user
    ph_ids = [str(x.id) for x in _photos(p)] or ["-"]
    history = db.scalars(select(AuditLog).where(
        or_(and_(AuditLog.target_type == "profile", AuditLog.target_id == p.member_id),
            and_(AuditLog.target_type == "user", AuditLog.target_id == (str(u.id) if u else "-")),
            and_(AuditLog.target_type == "photo", AuditLog.target_id.in_(ph_ids)))).order_by(AuditLog.id.desc()).limit(50)).all()
    sent = db.scalar(select(func.count(Interest.id)).where(Interest.from_profile_id == p.id)) or 0
    got = db.scalar(select(func.count(Interest.id)).where(Interest.to_profile_id == p.id)) or 0
    reports = db.scalar(select(func.count(Report.id)).where(Report.target_profile_id == p.id)) or 0
    open_reports = db.scalar(select(func.count(Report.id)).where(Report.target_profile_id == p.id, Report.status == "open")) or 0
    return {
        "member_id": p.member_id, "user_id": u.id if u else None, "approval_status": p.approval_status, "admin_notes": p.admin_notes,
        "is_hidden": bool(p.is_hidden), "created_at": _aware(p.created_at), "updated_at": _aware(p.updated_at),
        "account": {"phone": u.phone if u else None, "email": u.email if u else None,
                    "phone_verified": bool(u and u.phone_verified), "email_verified": bool(u and u.is_verified),
                    "status": u.status if u else "active", "has_account": u is not None,
                    "profile_for": p.registering_for or "Self", "plan": _plan(p),
                    "plan_expires": _aware(u.plan_expires_at) if u else None, "created_at": _aware(u.created_at) if u else None},
        "profile": _fields(p),
        "photos": [{"id": x.id, "position": x.position, "status": x.status} for x in _photos(p)],
        "sample_photo_url": p.photo_url, "gallery_urls": [g for g in (p.gallery_urls or []) if isinstance(g, str)],
        "activity": {
            "interests_sent": sent, "interests_received": got,
            "shortlisted_by": db.scalar(select(func.count(Shortlist.id)).where(Shortlist.shortlisted_id == p.id)) or 0,
            "messages_sent": db.scalar(select(func.count(Message.id)).where(Message.from_profile_id == p.id)) or 0,
            "reports_against": reports, "open_reports_against": open_reports,
        },
        "history": [{"id": h.id, "actor_id": h.actor_id, "action": h.action, "meta": _meta(h.meta), "created_at": _aware(h.created_at)}
                    for h in history],
    }


class MemberIn(BaseModel):
    registering_for: str | None = Field(default="Self", max_length=20)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    gender: str
    date_of_birth: date
    height_cm: float | None = Field(default=None, ge=120, le=230)
    marital_status: str | None = Field(default=None, max_length=30)
    physical_status: str | None = Field(default=None, max_length=30)
    mother_tongue: str | None = Field(default=None, max_length=50)
    denomination: str | None = Field(default=None, max_length=100)
    church_name: str | None = Field(default=None, max_length=200)
    church_location: str | None = Field(default=None, max_length=200)
    baptism_status: str | None = Field(default=None, max_length=30)
    pastor_name: str | None = Field(default=None, max_length=200)
    pastor_phone: str | None = Field(default=None, max_length=20)
    egf_member: str | None = Field(default=None, max_length=3)
    egf_details: str | None = Field(default=None, max_length=200)
    testimony: str | None = Field(default=None, max_length=3000)
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    education: str | None = Field(default=None, max_length=100)
    occupation: str | None = Field(default=None, max_length=100)
    organization: str | None = Field(default=None, max_length=200)
    annual_income: str | None = Field(default=None, max_length=100)
    father_occupation: str | None = Field(default=None, max_length=200)
    mother_occupation: str | None = Field(default=None, max_length=200)
    siblings: int | None = Field(default=None, ge=0, le=30)
    eating_habit: str | None = Field(default=None, max_length=30)
    smoking_habit: str | None = Field(default=None, max_length=30)
    drinking_habit: str | None = Field(default=None, max_length=30)
    hobbies: str | None = Field(default=None, max_length=300)
    fitness: str | None = Field(default=None, max_length=200)
    interests: list[str] | str | None = None  # a list, or comma-separated text from the dashboard form
    pref_age_min: int | None = Field(default=None, ge=18, le=80)
    pref_age_max: int | None = Field(default=None, ge=18, le=80)
    pref_education: str | None = Field(default=None, max_length=200)
    pref_location: str | None = Field(default=None, max_length=200)
    pref_qualities: str | None = Field(default=None, max_length=300)
    about_me: str | None = Field(default=None, max_length=2000)

    @field_validator("gender")
    @classmethod
    def _gender(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("male", "female"):
            raise ValueError("Gender must be male or female")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _dob(cls, v: date) -> date:
        if not (date.today() - timedelta(days=80 * 366) < v <= date.today() - timedelta(days=18 * 365)):
            raise ValueError("Member must be between 18 and 80 years old")
        return v

    @field_validator("egf_member")
    @classmethod
    def _egf(cls, v):
        if v not in (None, "", "yes", "no"):
            raise ValueError("EGF member must be yes or no")
        return v


class AdminMemberEdit(MemberIn):
    phone: str | None = None
    email: str | None = Field(default=None, max_length=255)
    approval_status: str | None = None

    @field_validator("phone")
    @classmethod
    def _p(cls, v):
        return _phone(v) if v else v

    @field_validator("approval_status")
    @classmethod
    def _s(cls, v):
        if v is not None and v not in STATUSES:
            raise ValueError("Unknown review status")
        return v


class AdminMemberCreate(AdminMemberEdit):
    phone: str
    email: str = Field(max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")  # the website signs members in by email
    password: str = Field(min_length=8, max_length=72)
    plan: str = "free"
    months: int = Field(default=3, ge=1, le=24)

    @field_validator("phone")
    @classmethod
    def _p2(cls, v):
        return _phone(v)

    @field_validator("plan")
    @classmethod
    def _pl(cls, v):
        v = v.strip().title()
        if v not in PLAN_NAMES:
            raise ValueError("Unknown plan")
        return v


# the API name differs from the database column for these
COLUMN = {"date_of_birth": "dob", "occupation": "profession", "about_me": "about"}
NOT_NULL_TEXT = {"city", "profession", "denomination", "education", "about"}


def _apply(p: Profile, data: dict) -> None:
    for key, v in data.items():
        if isinstance(v, str):
            v = v.strip() or None
        if key == "interests":
            items = v.split(",") if isinstance(v, str) else (v or [])
            v = [x.strip() for x in items if x and x.strip()][:12] or None
        if v is None and key in ("first_name", "last_name", "gender", "date_of_birth"):
            continue
        col = COLUMN.get(key, key)
        if v is None and col in NOT_NULL_TEXT:
            v = ""
        if key == "registering_for" and v is None:
            v = "Self"
        setattr(p, col, v)
    if p.egf_member != "yes":
        p.egf_details = None
    p.name = " ".join(x for x in (p.first_name, p.last_name) if x) or p.name
    if p.dob:
        p.age = _age(p.dob)


def _check_unique(db: Session, phone: str | None, email: str | None, user: User | None = None):
    if phone:
        o = db.scalar(select(User).where(User.phone == phone))
        if o and (not user or o.id != user.id):
            raise HTTPException(409, "That phone number is already registered")
    if email:
        o = db.scalar(select(User).where(User.email == email))
        if o and (not user or o.id != user.id):
            raise HTTPException(409, "That email is already registered")


@router.post("/members", status_code=201)
def create_member(body: AdminMemberCreate, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    email = body.email.strip().lower()
    _check_unique(db, body.phone, email)
    u = User(email=email, phone=body.phone, password_hash=hash_password(body.password), is_verified=True, phone_verified=True)
    _set_plan(u, body.plan, body.months)
    db.add(u)
    db.flush()
    p = Profile(user_id=u.id, name="", age=0, gender=body.gender, city="", profession="", denomination="",
                created_at=datetime.utcnow())
    _apply(p, body.model_dump(exclude={"phone", "email", "password", "plan", "months", "approval_status"}))
    p.set_approval(body.approval_status or "approved")
    db.add(p)
    db.flush()
    _audit(db, admin, "member.create", "profile", p.member_id, user_id=u.id)
    db.commit()
    _notify(bg, u, "Welcome to Cedar Matrimony", "Your profile has been created",
            f"Your Cedar Matrimony profile ({p.member_id}) has been created by our team.",
            f"Current status: {p.approval_status.replace('_', ' ')}.")
    return {"member_id": p.member_id, "message": "Member created"}


@router.put("/members/{member_id}")
def edit_member(member_id: str, body: AdminMemberEdit, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    p = _by_member_id(db, member_id)
    u = p.user
    email = (body.email or "").strip().lower() or None
    if u:
        _check_unique(db, body.phone, email, u)
    elif body.phone or email:
        raise HTTPException(400, "This is a sample profile without a login account, so phone / email cannot be set.")
    _apply(p, body.model_dump(exclude={"phone", "email", "approval_status"}))
    if u:
        if body.phone:
            if body.phone != u.phone:
                u.phone_verified = False
            u.phone = body.phone
        if email:
            u.email = email
    changed = bool(body.approval_status and body.approval_status != p.approval_status)
    if body.approval_status:
        p.set_approval(body.approval_status)
    _audit(db, admin, "member.edit", "profile", p.member_id)
    db.commit()
    if changed:
        headline, line = MAIL[p.approval_status] if p.approval_status in MAIL else ("Your profile is under review", "Your profile is being reviewed.")
        _notify(bg, u, f"Cedar Matrimony: {headline}", headline, line)
    return {"message": "Member updated"}


def _purge_profile(db: Session, p: Profile) -> list[str]:
    """Delete a member and everything that points at them. Returns the photo files to remove from disk."""
    pid = p.id
    for model, cols in ((Interest, ("from_profile_id", "to_profile_id")), (Message, ("from_profile_id", "to_profile_id")),
                        (Report, ("reporter_profile_id", "target_profile_id")), (Shortlist, ("profile_id", "shortlisted_id"))):
        for row in db.scalars(select(model).where(or_(*[getattr(model, c) == pid for c in cols]))).all():
            db.delete(row)
    files = [ph.filename for ph in (p.user.photos if p.user else [])]
    user = p.user
    db.delete(p)
    db.flush()
    if user:
        db.delete(user)  # photos go with it (cascade)
    return files


@router.delete("/members/{member_id}")
def delete_member(member_id: str, bg: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    p = _by_member_id(db, member_id)
    if p.user and p.user.is_admin:
        raise HTTPException(400, "Admin accounts cannot be deleted here")
    mid, email = p.member_id, (p.user.email if p.user else None)
    files = _purge_profile(db, p)
    _audit(db, admin, "member.delete", "profile", mid)
    db.commit()
    for name in files:
        (Path(settings.upload_dir) / name).unlink(missing_ok=True)
    if email:
        bg.add_task(notify_member, email, "Cedar Matrimony: Your profile was removed", "Your profile has been removed",
                    f"Your profile ({mid}) has been removed from Cedar Matrimony by our team.", "/", "Visit Cedar Matrimony")
    return {"message": f"{mid} deleted"}


# ---- website contact-form enquiries ---------------------------------------------------------------
@router.get("/enquiries")
def list_enquiries(page: int = Query(1, ge=1), size: int = Query(30, ge=1, le=100), db: Session = Depends(get_db)):
    """Messages sent from the website's Contact page."""
    total = db.scalar(select(func.count(ContactMessage.id))) or 0
    rows = db.scalars(select(ContactMessage).order_by(ContactMessage.id.desc()).offset((page - 1) * size).limit(size)).all()
    return {"total": total, "page": page, "size": size,
            "items": [{"id": r.id, "name": r.name, "email": r.email, "phone": r.phone, "subject": r.subject, "message": r.message,
                       "created_at": _aware(r.created_at)} for r in rows]}


@router.delete("/enquiries/{enquiry_id}")
def delete_enquiry(enquiry_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    r = db.get(ContactMessage, enquiry_id)
    if not r:
        raise HTTPException(404, "Enquiry not found")
    db.delete(r)
    _audit(db, admin, "enquiry.delete", "enquiry", enquiry_id)
    db.commit()
    return {"message": "Enquiry deleted"}
