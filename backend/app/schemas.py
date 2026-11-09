from datetime import date, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterIn(BaseModel):
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmailIn(BaseModel):
    email: EmailStr


class OtpIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    plan: str
    is_verified: bool
    has_profile: bool
    phone: str | None = None
    phone_verified: bool = False

    model_config = {"from_attributes": True}


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=18, le=80)
    gender: str
    city: str
    profession: str
    education: str = ""
    denomination: str
    about: str = ""
    photo_url: str | None = None


class ProfileOut(BaseModel):
    id: int
    name: str
    age: int
    city: str
    profession: str
    education: str = ""
    denomination: str
    photo_url: str | None
    verified: bool
    match: int | None = None
    state: str | None = None
    marital_status: str | None = None
    photo_id: int | None = None  # main uploaded photo (needs the login token to download)

    model_config = {"from_attributes": True}


RegisteringFor = Literal["Self", "Son", "Daughter", "Brother", "Sister", "Relative"]
Habit = Literal["no", "yes", "occasionally"]


class MyProfileOut(BaseModel):
    """The member's own full profile (fields other members never see are included)."""
    id: int
    verified: bool  # admin approval
    registering_for: str = "Self"
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    age: int | None = None
    height_cm: int | None = None
    marital_status: str | None = None
    physical_status: str | None = None
    mother_tongue: str | None = None
    denomination: str | None = None
    church_name: str | None = None
    church_location: str | None = None
    baptism_status: str | None = None
    pastor_name: str | None = None
    egf_member: str | None = None
    egf_details: str | None = None
    testimony: str | None = None
    country: str | None = None
    state: str | None = None
    district: str | None = None
    city: str | None = None
    education: str | None = None
    occupation: str | None = None
    organization: str | None = None
    annual_income: str | None = None
    father_occupation: str | None = None
    mother_occupation: str | None = None
    siblings: int | None = None
    eating_habit: str | None = None
    smoking_habit: str | None = None
    drinking_habit: str | None = None
    hobbies: str | None = None
    fitness: str | None = None
    interests: list[str] = []
    pref_age_min: int | None = None
    pref_age_max: int | None = None
    pref_education: str | None = None
    pref_location: str | None = None
    pref_qualities: str | None = None
    about_me: str | None = None

    @field_validator("interests", mode="before")
    @classmethod
    def _interests_not_null(cls, v):
        return v or []
    approval_status: str | None = None   # pending | approved | rejected | changes_requested
    admin_notes: str | None = None       # the reviewer's note when changes were requested / the profile was rejected
    is_hidden: bool = False


class ProfilePatch(BaseModel):
    """Any subset of the profile fields; only the fields sent are changed (null clears optional ones)."""
    registering_for: RegisteringFor | None = None
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    gender: Literal["male", "female"] | None = None
    date_of_birth: date | None = None
    height_cm: int | None = Field(default=None, ge=120, le=230)
    marital_status: Literal["never_married", "divorced", "widowed", "awaiting_divorce", "annulled"] | None = None
    physical_status: Literal["normal", "physically_challenged"] | None = None
    mother_tongue: str | None = Field(default=None, max_length=50)
    denomination: str | None = Field(default=None, max_length=100)
    church_name: str | None = Field(default=None, max_length=200)
    church_location: str | None = Field(default=None, max_length=200)
    baptism_status: Literal["baptized", "not_baptized"] | None = None
    pastor_name: str | None = Field(default=None, max_length=200)
    egf_member: Literal["yes", "no"] | None = None
    egf_details: str | None = Field(default=None, max_length=200)
    testimony: str | None = Field(default=None, max_length=3000)
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    education: str | None = Field(default=None, max_length=200)
    occupation: str | None = Field(default=None, max_length=200)
    organization: str | None = Field(default=None, max_length=200)
    annual_income: str | None = Field(default=None, max_length=100)
    father_occupation: str | None = Field(default=None, max_length=200)
    mother_occupation: str | None = Field(default=None, max_length=200)
    siblings: int | None = Field(default=None, ge=0, le=20)
    eating_habit: Literal["vegetarian", "non_vegetarian", "eggetarian", "vegan"] | None = None
    smoking_habit: Habit | None = None
    drinking_habit: Habit | None = None
    hobbies: str | None = Field(default=None, max_length=300)
    fitness: str | None = Field(default=None, max_length=200)
    interests: list[str] | None = None
    pref_age_min: int | None = Field(default=None, ge=18, le=80)
    pref_age_max: int | None = Field(default=None, ge=18, le=80)
    pref_education: str | None = Field(default=None, max_length=200)
    pref_location: str | None = Field(default=None, max_length=200)
    pref_qualities: str | None = Field(default=None, max_length=300)
    about_me: str | None = Field(default=None, max_length=2000)

    @field_validator("interests", mode="before")
    @classmethod
    def _clean_interests(cls, v):
        # tidy the list: trim, drop blanks and duplicates, cap the length of each tag and the number of tags
        if v is None:
            return None
        if not isinstance(v, list):
            raise ValueError("Interests must be a list")
        out: list[str] = []
        for x in v:
            t = str(x).strip()[:40]
            if t and t.lower() not in {o.lower() for o in out}:
                out.append(t)
        return out[:12]

    @model_validator(mode="after")
    def _age_range(self):
        if self.pref_age_min is not None and self.pref_age_max is not None and self.pref_age_min > self.pref_age_max:
            raise ValueError("Preferred minimum age cannot be above the maximum age")
        return self

    @field_validator("gender", mode="before")
    @classmethod
    def _lower_gender(cls, v):
        return v.lower() if isinstance(v, str) else v

    @field_validator("date_of_birth")
    @classmethod
    def _adult(cls, v):
        if v is not None:
            if v > date.today() - timedelta(days=18 * 365 + 4):
                raise ValueError("Must be at least 18 years old")
            if v < date.today() - timedelta(days=80 * 366):
                raise ValueError("Please check the date of birth")
        return v


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class PhoneIn(BaseModel):
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")


class CodeIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class PlanOut(BaseModel):
    name: str
    price: int
    period: str
    features: list[str]
    excluded: list[str] = []
    highlight: bool

    @field_validator("excluded", mode="before")
    @classmethod
    def _no_null(cls, v):
        return v or []  # old rows have NULL here until the seed refreshes them

    model_config = {"from_attributes": True}


class StoryOut(BaseModel):
    quote: str
    couple: str
    city: str

    model_config = {"from_attributes": True}


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    subject: str | None = Field(default=None, max_length=100)
    message: str = Field(min_length=5, max_length=2000)


class ProfileDetailOut(BaseModel):
    """Full profile page. Never includes email, phone, date of birth or income."""
    id: int
    name: str
    age: int
    gender: str
    verified: bool
    photo_url: str | None = None
    photo_ids: list[int] = []
    match: int | None = None
    is_me: bool = False
    shortlisted: bool = False
    interest_sent: bool = False
    interest_status: str | None = None    # status of the interest I sent: pending | accepted | declined
    they_interested: str | None = None    # status of an interest THEY sent me
    their_interest_id: int | None = None  # so I can accept / decline it from their profile
    connected: bool = False               # either side accepted -> chat is open
    about: str | None = None
    city: str | None = None
    state: str | None = None
    district: str | None = None
    country: str | None = None
    height_cm: int | None = None
    marital_status: str | None = None
    physical_status: str | None = None
    mother_tongue: str | None = None
    denomination: str | None = None
    church_name: str | None = None
    church_location: str | None = None
    baptism_status: str | None = None
    pastor_name: str | None = None      # only filled in for the owner
    egf_member: str | None = None
    egf_details: str | None = None
    testimony: str | None = None
    education: str | None = None
    profession: str | None = None
    organization: str | None = None
    father_occupation: str | None = None
    mother_occupation: str | None = None
    siblings: int | None = None
    eating_habit: str | None = None
    smoking_habit: str | None = None
    drinking_habit: str | None = None
    hobbies: str | None = None
    fitness: str | None = None
    interests: list[str] = []
    pref_age_min: int | None = None
    pref_age_max: int | None = None
    pref_education: str | None = None
    pref_location: str | None = None
    pref_qualities: str | None = None
    gallery_urls: list[str] = []          # ready-made photos (demo profiles); uploaded ones come as photo_ids


class InterestItem(BaseModel):
    id: int
    status: str
    created_at: datetime
    unseen: bool = False
    profile: ProfileOut


class ConversationOut(BaseModel):
    profile: ProfileOut
    last_message: str | None = None
    last_at: datetime | None = None
    unread: int = 0


class MessageOut(BaseModel):
    id: int
    mine: bool
    body: str
    created_at: datetime


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ThreadOut(BaseModel):
    profile: ProfileOut
    messages: list[MessageOut]
    can_reply: bool = True


class NotificationSummary(BaseModel):
    pending_interests: int
    accepted_unseen: int
    unread_messages: int
    total: int


class CompletenessOut(BaseModel):
    percent: int
    missing: list[str]


class ReportIn(BaseModel):
    reason: str = Field(min_length=3, max_length=100)
    details: str | None = Field(default=None, max_length=1000)


class VisibilityIn(BaseModel):
    hidden: bool
