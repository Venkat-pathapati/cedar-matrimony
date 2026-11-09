from datetime import date, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..emailer import notify_member
from ..matching import match_score
from ..models import Interest, Profile, Report, Shortlist, User
from ..schemas import CompletenessOut, MyProfileOut, ProfileDetailOut, ProfileIn, ProfileOut, ProfilePatch, ReportIn, VisibilityIn
from ..security import current_user

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

FREE_INTEREST_LIMIT = 5


def _out(p: Profile, match: int | None = None) -> ProfileOut:
    out = ProfileOut.model_validate(p)
    out.match = match
    return out


@router.get("/featured", response_model=list[ProfileOut])
def featured(db: Session = Depends(get_db)):
    """Public. Only admin-verified profiles; first name only (privacy)."""
    rows = db.scalars(select(Profile).where(Profile.verified.is_(True), Profile.is_hidden.is_(False)).limit(4)).all()
    result = []
    for p in rows:
        out = _out(p)
        out.name = p.name.split()[0]
        result.append(out)
    return result


def _my_out(p: Profile) -> MyProfileOut:
    return MyProfileOut(
        id=p.id, verified=p.verified, registering_for=p.registering_for or "Self",
        first_name=p.first_name, last_name=p.last_name, gender=p.gender or None,
        date_of_birth=p.dob, age=p.age or None, height_cm=p.height_cm,
        marital_status=p.marital_status, physical_status=p.physical_status, mother_tongue=p.mother_tongue,
        denomination=p.denomination or None, church_name=p.church_name, church_location=p.church_location,
        baptism_status=p.baptism_status, pastor_name=p.pastor_name,
        egf_member=p.egf_member, egf_details=p.egf_details, testimony=p.testimony,
        country=p.country, state=p.state, district=p.district, city=p.city or None,
        education=p.education or None, occupation=p.profession or None, organization=p.organization,
        annual_income=p.annual_income, father_occupation=p.father_occupation, mother_occupation=p.mother_occupation,
        siblings=p.siblings, eating_habit=p.eating_habit, smoking_habit=p.smoking_habit, drinking_habit=p.drinking_habit,
        hobbies=p.hobbies, fitness=p.fitness, interests=p.interests or [],
        pref_age_min=p.pref_age_min, pref_age_max=p.pref_age_max, pref_education=p.pref_education,
        pref_location=p.pref_location, pref_qualities=p.pref_qualities,
        about_me=p.about or None,
        approval_status=p.approval_status, admin_notes=p.admin_notes, is_hidden=bool(p.is_hidden),
    )


@router.get("/me", response_model=MyProfileOut | None)
def my_profile(user: User = Depends(current_user)):
    """The logged-in user's own full profile (null if not created yet)."""
    return _my_out(user.profile) if user.profile else None


@router.put("/me", response_model=MyProfileOut)
def upsert_my_profile(data: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = user.profile or Profile(user_id=user.id, verified=False, approval_status="pending")  # admin must approve
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    if p.approval_status == "changes_requested":
        p.approval_status = "pending"  # the member fixed it: back into the review queue
    db.add(p)
    db.commit()
    db.refresh(p)
    return _my_out(p)


def _age(dob: date) -> int:
    t = date.today()
    return t.year - dob.year - ((t.month, t.day) < (dob.month, dob.day))


# API field -> database column, for the fields whose names differ
COLUMN = {"date_of_birth": "dob", "occupation": "profession", "about_me": "about"}
# columns that cannot be NULL in the database: "cleared" means empty text
NOT_NULL_TEXT = {"city", "profession", "denomination", "education", "about"}
# these must always have a value once set
REQUIRED = {"first_name", "last_name", "gender", "date_of_birth", "registering_for"}


@router.patch("/me", response_model=MyProfileOut)
def patch_my_profile(data: ProfilePatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Save the profile form (or any subset of it). Creates the profile on first save."""
    p = user.profile or Profile(
        user_id=user.id, verified=False, approval_status="pending",  # admin must approve before it is shown to others
        name="", age=0, gender="", city="", profession="", denomination="",
    )
    for key, v in data.model_dump(exclude_unset=True).items():
        if isinstance(v, str):
            v = v.strip() or None
        if key == "interests":
            v = [x.strip() for x in (v or []) if x and x.strip()][:12] or None
        if v is None and key in REQUIRED:
            continue
        col = COLUMN.get(key, key)
        if v is None and col in NOT_NULL_TEXT:
            v = ""
        setattr(p, col, v)
    if p.egf_member != "yes":
        p.egf_details = None  # details only make sense for EGF members
    p.name = " ".join(x for x in (p.first_name, p.last_name) if x) or p.name
    if p.dob:
        p.age = _age(p.dob)
    if p.approval_status == "changes_requested":
        p.approval_status = "pending"  # the member fixed it: back into the review queue
    db.add(p)
    db.commit()
    db.refresh(p)
    return _my_out(p)


@router.get("", response_model=list[ProfileOut])
def browse(
    city: str | None = None,
    denomination: str | None = None,
    min_age: int = 18,
    max_age: int = 80,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    q = select(Profile).where(
        Profile.verified.is_(True), Profile.is_hidden.is_(False), Profile.id != me.id,
        Profile.gender != me.gender, Profile.age.between(min_age, max_age),
    )
    if city:
        q = q.where(Profile.city.ilike(city))
    if denomination:
        q = q.where(Profile.denomination.ilike(denomination))
    rows = db.scalars(q).all()
    return sorted((_out(p, match_score(me, p)) for p in rows), key=lambda o: o.match or 0, reverse=True)


@router.post("/{profile_id}/interest", status_code=201)
def send_interest(profile_id: int, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    if not db.get(Profile, profile_id) or profile_id == me.id:
        raise HTTPException(404, "Profile not found")
    if user.effective_plan == "Free":
        since = datetime.utcnow() - timedelta(days=1)   # the plan says "5 per day"
        sent = len(db.scalars(select(Interest).where(Interest.from_profile_id == me.id, Interest.created_at > since)).all())
        if sent >= FREE_INTEREST_LIMIT:
            raise HTTPException(402, "Free plan interest limit reached. Upgrade to continue.")
    if db.scalar(select(Interest).where(Interest.from_profile_id == me.id, Interest.to_profile_id == profile_id)):
        raise HTTPException(409, "Interest already sent")
    db.add(Interest(from_profile_id=me.id, to_profile_id=profile_id))
    db.commit()
    target = db.get(Profile, profile_id)
    if target and target.user:
        bg.add_task(notify_member, target.user.email, f"{me.first} is interested in your profile",
                    "You have a new interest",
                    f"{me.name} ({me.age}) has shown interest in your profile. Open Cedar Matrimony to view their profile and accept or decline.",
                    "/interests", "View interest")
    return {"message": "Interest sent"}


@router.post("/{profile_id}/shortlist", status_code=201)
def shortlist(profile_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    if not db.get(Profile, profile_id):
        raise HTTPException(404, "Profile not found")
    if not db.scalar(select(Shortlist).where(Shortlist.profile_id == me.id, Shortlist.shortlisted_id == profile_id)):
        db.add(Shortlist(profile_id=me.id, shortlisted_id=profile_id))
        db.commit()
    return {"message": "Shortlisted"}


@router.delete("/{profile_id}/shortlist")
def unshortlist(profile_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    row = db.scalar(select(Shortlist).where(Shortlist.profile_id == me.id, Shortlist.shortlisted_id == profile_id))
    if row:
        db.delete(row)
        db.commit()
    return {"message": "Removed from shortlist"}


@router.put("/me/visibility")
def set_visibility(data: VisibilityIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Hide the profile from search and from other members (and show it again)."""
    if not user.profile:
        raise HTTPException(400, "Create your profile first")
    user.profile.is_hidden = data.hidden
    db.commit()
    return {"is_hidden": user.profile.is_hidden}


@router.post("/{profile_id}/report", status_code=201)
def report_profile(profile_id: int, data: ReportIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Report a member to the admin team (appears under Escalations in the dashboard)."""
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    if profile_id == me.id or not db.get(Profile, profile_id):
        raise HTTPException(404, "Profile not found")
    if db.scalar(select(Report).where(Report.reporter_profile_id == me.id, Report.target_profile_id == profile_id,
                                      Report.status == "open")):
        raise HTTPException(409, "You have already reported this member")
    db.add(Report(reporter_profile_id=me.id, target_profile_id=profile_id, reason=data.reason.strip(),
                  details=(data.details or "").strip() or None))
    db.commit()
    return {"message": "Thank you. Our team will review this report."}


@router.get("/me/completeness", response_model=CompletenessOut)
def completeness(user: User = Depends(current_user)):
    """How complete the member's profile is, and what to add next."""
    p = user.profile
    if not p:
        return CompletenessOut(percent=0, missing=["Create your profile"])
    checks = [
        ("Add a profile photo", bool(user.photos)), ("Write a short About Me", bool(p.about)),
        ("Share your testimony", bool(p.testimony)), ("Add your church name", bool(p.church_name)),
        ("Add your denomination", bool(p.denomination)), ("Add your education", bool(p.education)),
        ("Add your profession", bool(p.profession)), ("Add your height", bool(p.height_cm)),
        ("Add your city", bool(p.city)), ("Add your mother tongue", bool(p.mother_tongue)),
        ("Add your family details", bool(p.father_occupation or p.mother_occupation)),
        ("Add your lifestyle (diet, habits)", bool(p.eating_habit)), ("Say whether you are an EGF member", bool(p.egf_member)),
    ]
    done = sum(1 for _, ok in checks if ok)
    return CompletenessOut(percent=round(100 * done / len(checks)), missing=[label for label, ok in checks if not ok])


@router.get("/{profile_id}", response_model=ProfileDetailOut)
def profile_detail(profile_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """A member's full profile page. Members only; others' profiles must be approved and of the opposite gender."""
    me = user.profile
    if not me:
        raise HTTPException(400, "Create your profile first")
    p = db.get(Profile, profile_id)
    is_me = p is not None and p.id == me.id
    if not p or (not is_me and (not p.verified or p.is_hidden or p.gender == me.gender)):
        raise HTTPException(404, "Profile not found")
    photo_ids = [ph.id for ph in sorted(p.user.photos, key=lambda x: x.position)
                 if is_me or ph.status != "rejected"] if p.user else []
    mine_i = db.scalar(select(Interest).where(Interest.from_profile_id == me.id, Interest.to_profile_id == p.id))
    theirs_i = db.scalar(select(Interest).where(Interest.from_profile_id == p.id, Interest.to_profile_id == me.id))
    out = ProfileDetailOut(
        id=p.id, name=p.name, age=p.age, gender=p.gender, verified=p.verified, photo_url=p.photo_url,
        photo_ids=photo_ids, match=None if is_me else match_score(me, p), is_me=is_me,
        shortlisted=bool(db.scalar(select(Shortlist).where(Shortlist.profile_id == me.id, Shortlist.shortlisted_id == p.id))),
        interest_sent=mine_i is not None, interest_status=mine_i.status if mine_i else None,
        they_interested=theirs_i.status if theirs_i else None, their_interest_id=theirs_i.id if theirs_i else None,
        about=p.about or None, city=p.city or None, state=p.state, district=p.district, country=p.country,
        height_cm=p.height_cm, marital_status=p.marital_status, physical_status=p.physical_status,
        mother_tongue=p.mother_tongue, denomination=p.denomination or None, church_name=p.church_name,
        church_location=p.church_location, baptism_status=p.baptism_status,
        pastor_name=p.pastor_name if is_me else None,
        egf_member=p.egf_member, egf_details=p.egf_details, testimony=p.testimony,
        education=p.education or None, profession=p.profession or None, organization=p.organization,
        father_occupation=p.father_occupation, mother_occupation=p.mother_occupation, siblings=p.siblings,
        eating_habit=p.eating_habit, smoking_habit=p.smoking_habit, drinking_habit=p.drinking_habit,
        hobbies=p.hobbies, fitness=p.fitness, interests=p.interests or [],
        pref_age_min=p.pref_age_min, pref_age_max=p.pref_age_max, pref_education=p.pref_education,
        pref_location=p.pref_location, pref_qualities=p.pref_qualities,
        gallery_urls=[u for u in (p.gallery_urls or []) if isinstance(u, str)],
    )
    return out
