from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # OTP verified
    otp_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    mobile_otp: Mapped[str | None] = mapped_column(String(6), nullable=True)
    plan: Mapped[str] = mapped_column(String(20), default="Free")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # --- admin dashboard (port 3001 / API 8001) ---
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | suspended | deactivated
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # None = no expiry

    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)
    photos: Mapped[list["Photo"]] = relationship(order_by="Photo.position", cascade="all, delete-orphan")

    @property
    def effective_plan(self) -> str:
        """The plan the member actually has right now (a paid plan that has expired counts as Free)."""
        if self.plan and self.plan != "Free" and self.plan_expires_at and self.plan_expires_at < datetime.utcnow():
            return "Free"
        return self.plan or "Free"


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(10))
    city: Mapped[str] = mapped_column(String(100))
    profession: Mapped[str] = mapped_column(String(100))
    education: Mapped[str] = mapped_column(String(100), default="")
    denomination: Mapped[str] = mapped_column(String(100))
    about: Mapped[str] = mapped_column(Text, default="")
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)  # admin approval
    # --- details edited from the dashboard (same fields as the original v0.3 profile form) ---
    registering_for: Mapped[str] = mapped_column(String(20), default="Self")  # Self/Son/Daughter/Brother/Sister/Relative
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(30), default="never_married", nullable=True)
    physical_status: Mapped[str | None] = mapped_column(String(30), default="normal", nullable=True)
    mother_tongue: Mapped[str | None] = mapped_column(String(50), default="Telugu", nullable=True)
    church_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    church_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    baptism_status: Mapped[str | None] = mapped_column(String(30), nullable=True)  # baptized | not_baptized
    pastor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    egf_member: Mapped[str | None] = mapped_column(String(3), nullable=True)  # "yes" | "no"
    egf_details: Mapped[str | None] = mapped_column(String(200), nullable=True)  # only when egf_member == "yes"
    testimony: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), default="India", nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    annual_income: Mapped[str | None] = mapped_column(String(100), nullable=True)
    father_occupation: Mapped[str | None] = mapped_column(String(200), nullable=True)
    mother_occupation: Mapped[str | None] = mapped_column(String(200), nullable=True)
    siblings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eating_habit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    smoking_habit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    drinking_habit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # --- lifestyle extras, interests and partner preferences (shown on the profile page) ---
    hobbies: Mapped[str | None] = mapped_column(String(300), nullable=True)
    fitness: Mapped[str | None] = mapped_column(String(200), nullable=True)
    interests: Mapped[list | None] = mapped_column(JSON, nullable=True)          # ["Traveling", "Music", ...]
    pref_age_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pref_age_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pref_education: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pref_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pref_qualities: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Ready-made photo URLs (used by the demo profiles; real members upload photos through /api/photos)
    gallery_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # --- admin dashboard ---
    # approval_status is the dashboard's review state; `verified` (what the website checks) is kept in step with it:
    # verified == (approval_status == "approved"). Always change it through set_approval().
    approval_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|approved|rejected|changes_requested
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pastor_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)  # admin-only, for verification
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # member hid the profile from search / other members
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="profile")

    @property
    def member_id(self) -> str:
        """Public member number shown in the dashboard, e.g. CM000012 (derived from the id, so it never changes)."""
        return f"CM{self.id:06d}"

    def set_approval(self, status: str) -> None:
        self.approval_status = status
        self.verified = status == "approved"

    @property
    def first(self) -> str:
        """First name for emails and messages (demo profiles have no first_name filled in)."""
        if self.first_name:
            return self.first_name
        return (self.name or "").split(" ")[0] or "A member"

    @property
    def photo_id(self) -> int | None:
        """First uploaded photo (the main one), if the member has uploaded any."""
        shown = [p for p in (self.user.photos if self.user else []) if p.status != "rejected"]
        return shown[0].id if shown else None


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(100), unique=True)
    position: Mapped[int] = mapped_column(Integer, default=0)  # 0 = main photo
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected (admin photo review)


class Interest(Base):
    __tablename__ = "interests"
    __table_args__ = (UniqueConstraint("from_profile_id", "to_profile_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    from_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"))
    to_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|accepted|declined
    sender_seen: Mapped[bool] = mapped_column(Boolean, default=True)  # False after it is accepted, until the sender looks
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # when it was accepted / declined


class Shortlist(Base):
    __tablename__ = "shortlists"
    __table_args__ = (UniqueConstraint("profile_id", "shortlisted_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"))
    shortlisted_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"))


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    price: Mapped[int] = mapped_column(Integer)  # INR
    period: Mapped[str] = mapped_column(String(20))
    features: Mapped[list] = mapped_column(JSON)
    excluded: Mapped[list | None] = mapped_column(JSON, nullable=True)  # features this plan does NOT include (shown with a cross)
    highlight: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote: Mapped[str] = mapped_column(Text)
    couple: Mapped[str] = mapped_column(String(150))
    city: Mapped[str] = mapped_column(String(100))
    published: Mapped[bool] = mapped_column(Boolean, default=True)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    to_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Report(Base):
    """A member reporting another member (shown as "Escalations" in the admin dashboard)."""
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    target_profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    reason: Mapped[str] = mapped_column(String(100))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """Who did what to whom in the admin dashboard. Never put passwords, OTPs or tokens in `meta`."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    target_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
