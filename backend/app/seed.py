from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import SessionLocal
from .models import Photo, Plan, Profile, Story, User
from .security import hash_password


PLANS = [
    {"name": "Free", "price": 0, "period": "Lifetime", "highlight": False,
     "features": ["Create Profile", "Basic Search", "View Profile Details (Limited)", "Send Interest (5 per day)"],
     "excluded": ["Chat with Matches", "View Contact Details", "Advanced Filters", "Priority Support"]},
    {"name": "Silver", "price": 999, "period": "3 Months", "highlight": False,
     "features": ["Everything in Free Plan", "View Full Profile Details", "Send Unlimited Interests", "Chat with Matches",
                  "View Contact Details (Limited)", "Basic Filters (Age, Location, etc.)"],
     "excluded": ["Advanced Filters", "Priority Support"]},
    {"name": "Gold", "price": 1899, "period": "6 Months", "highlight": True,
     "features": ["Everything in Silver Plan", "View Contact Details (Unlimited)", "Advanced Search Filters",
                  "See Who Viewed Your Profile", "Profile Highlighting", "Direct Message to Members",
                  "Priority Customer Support", "Verified Badge on Profile"],
     "excluded": []},
    {"name": "Platinum", "price": 2899, "period": "12 Months", "highlight": False,
     "features": ["Everything in Gold Plan", "Top Placement in Search Results", "Personalized Matchmaking Suggestions",
                  "Advanced Filters (Profession, Education, Lifestyle)", "Read Receipts for Messages",
                  "Dedicated Relationship Manager", "Profile Spotlight (More Visibility)", "Priority Support (Phone + Chat)"],
     "excluded": []},
]


def _gallery(name: str) -> list[str]:
    return [f"/profiles/gallery/{name}-{i}.jpg" for i in range(1, 6)]


# Demo members (no login). Photos are ready-made files in frontend/public/profiles/gallery/.
DEMO_PROFILES = [
    dict(name="Anusha Kumar", first_name="Anusha", last_name="Kumar", age=27, gender="female", city="Hyderabad", state="Telangana",
         profession="Software Engineer", education="B.Tech", organization="Leading IT company", denomination="Christian",
         photo_url="/profiles/anusha.jpg", verified=True, height_cm=163, mother_tongue="Telugu",
         church_name="Grace Community Church", church_location="Hyderabad", baptism_status="baptized", egf_member="no",
         about="A cheerful, God-fearing and family-oriented person. I value honesty, kindness and growing together in faith. Looking for a supportive life partner who shares the same values.",
         father_occupation="Retired Government Employee", mother_occupation="Homemaker", siblings=1,
         eating_habit="non_vegetarian", smoking_habit="no", drinking_habit="no",
         hobbies="Reading, Cooking, Gospel Music", fitness="Morning walks, Yoga",
         interests=["Worship Music", "Cooking", "Traveling", "Photography", "Reading", "Volunteering"],
         pref_age_min=27, pref_age_max=32, pref_education="Graduate / Post Graduate", pref_location="Hyderabad / Open",
         pref_qualities="God-fearing, Caring, Family-oriented", gallery_urls=_gallery("anusha")),
    dict(name="Rahul Paul", first_name="Rahul", last_name="Paul", age=29, gender="male", city="Bengaluru", state="Karnataka",
         profession="Business Professional", education="MBA", organization="Own business", denomination="Christian",
         photo_url="/profiles/rahul.jpg", verified=True, height_cm=177, mother_tongue="Telugu",
         church_name="Bethel Fellowship", church_location="Bengaluru", baptism_status="baptized", egf_member="yes", egf_details="Active member",
         about="Faith-centred and ambitious. I run a growing family business and love spending time with family and church community. Seeking a kind, understanding partner to build a Christ-centred home.",
         father_occupation="Businessman", mother_occupation="Homemaker", siblings=2,
         eating_habit="non_vegetarian", smoking_habit="no", drinking_habit="no",
         hobbies="Cricket, Trekking, Playing guitar", fitness="Gym, Weekend cricket",
         interests=["Cricket", "Trekking", "Guitar", "Entrepreneurship", "Road Trips", "Movies"],
         pref_age_min=24, pref_age_max=28, pref_education="Graduate", pref_location="Bengaluru / Hyderabad",
         pref_qualities="Kind, Prayerful, Good communicator", gallery_urls=_gallery("rahul")),
    dict(name="Sneha Raj", first_name="Sneha", last_name="Raj", age=26, gender="female", city="Vijayawada", state="Andhra Pradesh",
         profession="Teacher", education="M.Ed", organization="Private school", denomination="Christian",
         photo_url="/profiles/sneha.jpg", verified=True, height_cm=160, mother_tongue="Telugu",
         church_name="St. Paul's Church", church_location="Vijayawada", baptism_status="baptized", egf_member="no",
         about="I love teaching and shaping young minds. Simple, loving and rooted in faith. I hope to find a partner who is gentle, responsible and values family.",
         father_occupation="School Principal", mother_occupation="Teacher", siblings=1,
         eating_habit="non_vegetarian", smoking_habit="no", drinking_habit="no",
         hobbies="Painting, Singing in choir, Gardening", fitness="Walking, Light yoga",
         interests=["Choir", "Painting", "Gardening", "Teaching", "Baking", "Exploring New Places"],
         pref_age_min=26, pref_age_max=32, pref_education="Graduate / Post Graduate", pref_location="Andhra Pradesh / Telangana",
         pref_qualities="Gentle, Responsible, Family-oriented", gallery_urls=_gallery("sneha")),
    dict(name="David Joseph", first_name="David", last_name="Joseph", age=31, gender="male", city="Hyderabad", state="Telangana",
         profession="IT Professional", education="B.Tech", organization="Multinational company", denomination="Christian",
         photo_url="/profiles/david.jpg", verified=True, height_cm=174, mother_tongue="Telugu",
         church_name="Calvary Temple", church_location="Hyderabad", baptism_status="baptized", egf_member="no",
         about="Down-to-earth IT professional who loves serving in church and spending time with friends and family. Looking for a faithful and understanding life partner.",
         father_occupation="Retired Bank Manager", mother_occupation="Homemaker", siblings=1,
         eating_habit="non_vegetarian", smoking_habit="no", drinking_habit="no",
         hobbies="Photography, Badminton, Reading", fitness="Badminton, Cycling",
         interests=["Photography", "Badminton", "Cycling", "Technology", "Church Ministry", "Travel"],
         pref_age_min=24, pref_age_max=29, pref_education="Graduate", pref_location="Hyderabad / Open",
         pref_qualities="Faithful, Understanding, Supportive", gallery_urls=_gallery("david")),
]


def _fill_demo_details(db) -> None:
    """Fill in missing details on the demo members (never touches real members or values already set)."""
    for d in DEMO_PROFILES:
        row = db.scalar(select(Profile).where(Profile.name == d["name"], Profile.user_id.is_(None)))
        if row is None:
            continue
        for k, v in d.items():
            if k in ("name", "photo_url", "verified") or getattr(row, k, None) not in (None, "", []):
                continue
            setattr(row, k, v)


def seed():
    db = SessionLocal()
    try:
        # Plans are kept in sync on every start: existing rows are updated by name, missing ones are added.
        for i, d in enumerate(PLANS):
            row = db.scalar(select(Plan).where(Plan.name == d["name"]))
            if row is None:
                row = Plan(name=d["name"])
                db.add(row)
            row.price, row.period, row.highlight, row.sort_order = d["price"], d["period"], d["highlight"], i
            row.features, row.excluded = d["features"], d["excluded"]
        if not db.scalar(select(Story)):
            db.add_all([
                Story(quote="Replace with a real testimonial from a matched couple.", couple="Names", city="City"),
                Story(quote="Replace with a real testimonial from a matched couple.", couple="Names", city="City"),
            ])
        if not db.scalar(select(Profile)):
            db.add_all(Profile(**d) for d in DEMO_PROFILES)  # sample data for local development only
        else:
            _fill_demo_details(db)  # older databases: add the new gallery / lifestyle / preference details
        db.commit()
        _backfill_admin_fields(db)
        _seed_admin(db)
    finally:
        db.close()


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
