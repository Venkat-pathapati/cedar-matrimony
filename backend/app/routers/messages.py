"""Member-to-member messages. Every message is between two profiles; only the two members can read it."""
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..emailer import notify_member
from ..models import Message, Profile, User
from ..schemas import ConversationOut, MessageIn, MessageOut, ProfileOut, ThreadOut
from ..security import current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _my_profile(user: User) -> Profile:
    if not user.profile:
        raise HTTPException(400, "Create your profile first")
    return user.profile


def _card(p: Profile) -> ProfileOut:
    out = ProfileOut.model_validate(p)
    shown = [x for x in (p.user.photos if p.user else []) if x.status != "rejected"]
    if shown:
        out.photo_id = sorted(shown, key=lambda x: x.position)[0].id
    return out


def _can_message(me: Profile, other: Profile) -> bool:
    return other.id != me.id and other.verified and other.gender != me.gender


def _msg(m: Message, me_id: int) -> MessageOut:
    return MessageOut(id=m.id, mine=m.from_profile_id == me_id, body=m.body, created_at=m.created_at)


@router.get("/unread-count")
def unread_count(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.profile:
        return {"count": 0}
    n = db.scalar(select(func.count(Message.id)).where(Message.to_profile_id == user.profile.id, Message.is_read.is_(False)))
    return {"count": n or 0}


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _my_profile(user)
    rows = db.scalars(
        select(Message).where(or_(Message.from_profile_id == me.id, Message.to_profile_id == me.id)).order_by(Message.created_at.desc())
    ).all()
    seen: dict[int, ConversationOut] = {}
    for m in rows:                                   # newest first, so the first hit per person is the latest message
        other_id = m.to_profile_id if m.from_profile_id == me.id else m.from_profile_id
        if other_id not in seen:
            other = db.get(Profile, other_id)
            if not other:
                continue
            seen[other_id] = ConversationOut(profile=_card(other), last_message=m.body, last_at=m.created_at, unread=0)
        if m.to_profile_id == me.id and not m.is_read and other_id in seen:
            seen[other_id].unread += 1
    return list(seen.values())


@router.get("/with/{profile_id}", response_model=ThreadOut)
def thread(profile_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _my_profile(user)
    other = db.get(Profile, profile_id)
    if not other or other.id == me.id:
        raise HTTPException(404, "Profile not found")
    msgs = db.scalars(
        select(Message).where(
            or_(
                (Message.from_profile_id == me.id) & (Message.to_profile_id == other.id),
                (Message.from_profile_id == other.id) & (Message.to_profile_id == me.id),
            )
        ).order_by(Message.created_at, Message.id)
    ).all()
    if not msgs and not _can_message(me, other):
        raise HTTPException(404, "Profile not found")
    changed = False
    for m in msgs:
        if m.to_profile_id == me.id and not m.is_read:
            m.is_read = True
            changed = True
    if changed:
        db.commit()
    return ThreadOut(profile=_card(other), messages=[_msg(m, me.id) for m in msgs], can_reply=_can_message(me, other))


@router.post("/with/{profile_id}", response_model=MessageOut, status_code=201)
def send(profile_id: int, data: MessageIn, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    me = _my_profile(user)
    other = db.get(Profile, profile_id)
    if not other or not _can_message(me, other):
        raise HTTPException(404, "Profile not found")
    if settings.chat_requires_paid_plan and user.plan == "Free":
        raise HTTPException(402, "Messaging is available on paid plans. Upgrade to continue.")
    body = data.body.strip()
    if not body:
        raise HTTPException(400, "Message cannot be empty")
    recent = db.scalar(select(func.count(Message.id)).where(
        Message.from_profile_id == me.id, Message.created_at > datetime.utcnow() - timedelta(hours=1)))
    if (recent or 0) >= settings.chat_messages_per_hour:
        raise HTTPException(429, "You are sending messages too quickly. Please try again later.")
    already_unread = db.scalar(select(func.count(Message.id)).where(
        Message.from_profile_id == me.id, Message.to_profile_id == other.id, Message.is_read.is_(False))) or 0
    m = Message(from_profile_id=me.id, to_profile_id=other.id, body=body)
    db.add(m)
    db.commit()
    db.refresh(m)
    if other.user and already_unread == 0:   # one email per burst of messages, not one per message
        bg.add_task(notify_member, other.user.email, f"New message from {me.first}", "You have a new message",
                    f"{me.name} has sent you a message on Cedar Matrimony.", f"/messages?with={me.id}", "Read message")
    return _msg(m, me.id)
