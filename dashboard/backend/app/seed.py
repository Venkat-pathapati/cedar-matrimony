"""Start-up tasks for the dashboard API: review state for older rows, and the admin account."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import SessionLocal
from .models import Photo, Profile, User
from .security import hash_password
def _backfill_admin_fields(db) -> None:
    """Old rows (created before the admin dashboard existed) get sensible review state and dates."""
    now = datetime.utcnow()
    for p in db.scalars(select(Profile)).all():
        if p.verified and p.approval_status in (None, "pending"):
            p.approval_status = "approved"        # was approved on the old website: keep it approved
        if not p.verified and p.approval_status == "approved":
            p.verified = True                      # the two flags must never disagree
        if p.created_at is None:
            p.created_at = (p.user.created_at if p.user else None) or now
        if p.updated_at is None:
            p.updated_at = p.created_at
        if p.is_hidden is None:
            p.is_hidden = False
    for u in db.scalars(select(User)).all():
        if u.status is None:
            u.status = "active"
        if u.is_admin is None:
            u.is_admin = False
    for ph in db.scalars(select(Photo)).all():
        if ph.status is None:
            ph.status = "pending"
    db.commit()


def _seed_admin(db) -> None:
    """Create the admin account from backend/.env (ADMIN_EMAIL / ADMIN_PASSWORD) if there is none yet."""
    if not (settings.admin_email and settings.admin_password):
        return
    email = settings.admin_email.strip().lower()
    admin = db.scalar(select(User).where(User.is_admin.is_(True)).order_by(User.id))
    if admin is None:
        other = db.scalar(select(User).where(User.email == email))
        if other is not None:                      # a member already uses that email: promote nobody, avoid a clash
            print(f"[ADMIN] {email} is already a member account. Choose another ADMIN_EMAIL in backend/.env.")
            return
        admin = User(email=email, phone=settings.admin_phone, password_hash=hash_password(settings.admin_password),
                     is_verified=True, phone_verified=True, is_admin=True, plan="Platinum")
        db.add(admin)
    else:
        # The password is only set when the account is created. Re-syncing it on every start would silently undo a
        # password changed in the dashboard Settings. To reset it: python -m app.reset_admin
        if admin.email != email and not db.scalar(select(User).where(User.email == email, User.id != admin.id)):
            admin.email = email
    try:
        db.commit()
    except IntegrityError:  # the other API created the same admin a split second earlier: that is fine
        db.rollback()
        return
    if settings.admin_password == "Admin@4949":
        print("[ADMIN] Using the default admin password. Set ADMIN_PASSWORD in backend/.env before going live.")


def ensure_admin() -> None:
    """What the dashboard API needs at start-up (the website API's seed() adds the sample content): review state for
    older rows, and the admin account."""
    db = SessionLocal()
    try:
        _backfill_admin_fields(db)
        _seed_admin(db)
    finally:
        db.close()
