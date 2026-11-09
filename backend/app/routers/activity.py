"""Interests inbox (received / sent, accept / decline), the shortlist, and the notification counts."""
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..emailer import notify_member
from ..matching import match_score
from ..models import Interest, Message, Profile, Shortlist, User
from ..schemas import InterestItem, NotificationSummary, ProfileOut
from ..security import current_user

router = APIRouter(prefix="/api", tags=["activity"])


def _me(user: User) -> Profile:
    if not user.profile:
        raise HTTPException(400, "Create your profile first")
    return user.profile


def _card(me: Profile, p: Profile) -> ProfileOut:
    out = ProfileOut.model_validate(p)
    out.match = match_score(me, p)
    shown = [x for x in (p.user.photos if p.user else []) if x.status != "rejected"]
    if shown:
        out.photo_id = sorted(shown, key=lambda x: x.position)[0].id
    return out


@router.get("/interests/received", response_model=list[InterestItem])
def received(user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _me(user)
    rows = db.scalars(select(Interest).where(Interest.to_profile_id == me.id).order_by(Interest.created_at.desc())).all()
    out = []
    for i in rows:
        p = db.get(Profile, i.from_profile_id)
        if p:
            out.append(InterestItem(id=i.id, status=i.status, created_at=i.created_at, unseen=i.status == "pending", profile=_card(me, p)))
    return out


@router.get("/interests/sent", response_model=list[InterestItem])
def sent(user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _me(user)
    rows = db.scalars(select(Interest).where(Interest.from_profile_id == me.id).order_by(Interest.created_at.desc())).all()
    out = []
    for i in rows:
        p = db.get(Profile, i.to_profile_id)
        if p:
            out.append(InterestItem(id=i.id, status=i.status, created_at=i.created_at,
                                    unseen=i.status == "accepted" and not i.sender_seen, profile=_card(me, p)))
    return out


@router.post("/interests/seen")
def mark_seen(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The sender has looked at the accepted interests list."""
    me = _me(user)
    for i in db.scalars(select(Interest).where(Interest.from_profile_id == me.id, Interest.sender_seen.is_(False))).all():
        i.sender_seen = True
    db.commit()
    return {"ok": True}


def _answer(interest_id: int, status: str, user: User, db: Session) -> tuple[Interest, Profile]:
    me = _me(user)
    i = db.get(Interest, interest_id)
    if not i or i.to_profile_id != me.id:
        raise HTTPException(404, "Interest not found")
    if i.status != "pending":
        raise HTTPException(409, f"You already {i.status} this interest")
    i.status = status
    i.responded_at = datetime.utcnow()
    i.sender_seen = status != "accepted"   # an acceptance is "news" for the sender until they look
    db.commit()
    return i, me


@router.post("/interests/{interest_id}/accept")
def accept(interest_id: int, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    i, me = _answer(interest_id, "accepted", user, db)
    sender = db.get(Profile, i.from_profile_id)
    if sender and sender.user:
        bg.add_task(notify_member, sender.user.email, f"{me.first} accepted your interest", "Good news!",
                    f"{me.name} ({me.age}) has accepted your interest. You can now send them a message.",
                    f"/messages?with={me.id}", "Send a message")
    return {"message": "Interest accepted", "status": "accepted"}


@router.post("/interests/{interest_id}/decline")
def decline(interest_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _answer(interest_id, "declined", user, db)
    return {"message": "Interest declined", "status": "declined"}


@router.get("/shortlist", response_model=list[ProfileOut])
def my_shortlist(user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _me(user)
    rows = db.scalars(select(Shortlist).where(Shortlist.profile_id == me.id).order_by(Shortlist.id.desc())).all()
    out = []
    for r in rows:
        p = db.get(Profile, r.shortlisted_id)
        if p and (p.verified or p.id == me.id):
            out.append(_card(me, p))
    return out


@router.get("/notifications/summary", response_model=NotificationSummary)
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.profile:
        return NotificationSummary(pending_interests=0, accepted_unseen=0, unread_messages=0, total=0)
    me = user.profile
    pending = db.scalar(select(func.count(Interest.id)).where(Interest.to_profile_id == me.id, Interest.status == "pending")) or 0
    accepted = db.scalar(select(func.count(Interest.id)).where(
        Interest.from_profile_id == me.id, Interest.status == "accepted", Interest.sender_seen.is_(False))) or 0
    unread = db.scalar(select(func.count(Message.id)).where(Message.to_profile_id == me.id, Message.is_read.is_(False))) or 0
    return NotificationSummary(pending_interests=pending, accepted_unseen=accepted, unread_messages=unread, total=pending + accepted + unread)
