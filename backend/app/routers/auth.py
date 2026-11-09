import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..emailer import send_verification_code, smtp_configured
from ..models import User
from ..schemas import CodeIn, EmailIn, LoginIn, OtpIn, PasswordChangeIn, PhoneIn, RegisterIn, TokenOut, UserOut
from ..sms import send_sms
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = logging.getLogger("cedar.auth")


def _new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _deliver_otp(email: str, otp: str) -> None:
    """Email the code. If SMTP isn't configured yet, print it to the terminal (development only)."""
    if not smtp_configured():
        print(f"[DEV] SMTP not configured - OTP for {email}: {otp}")
        return
    try:
        send_verification_code(email, otp)
    except Exception:
        log.exception("Could not send verification email to %s", email)
        raise HTTPException(502, "Could not send the verification email. Please try again in a moment.")


@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user and user.is_verified:
        raise HTTPException(409, "Email already registered")
    otp = _new_otp()
    if user:  # signed up before but never verified: update details and send a fresh code
        user.phone = data.phone
        user.password_hash = hash_password(data.password)
        user.otp_code = otp
    else:
        user = User(email=email, phone=data.phone, password_hash=hash_password(data.password), otp_code=otp)
        db.add(user)
    db.commit()
    _deliver_otp(email, otp)
    return {"message": "Registered. Enter the verification code sent to your email."}


@router.post("/resend-otp")
def resend_otp(data: EmailIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user and not user.is_verified:
        user.otp_code = _new_otp()
        db.commit()
        _deliver_otp(user.email, user.otp_code)
    # same answer whether or not the account exists, so emails can't be probed
    return {"message": "If this email is waiting for verification, a new code has been sent."}


@router.post("/verify-otp", response_model=TokenOut)
def verify_otp(data: OtpIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.otp_code or not secrets.compare_digest(user.otp_code, data.code):
        raise HTTPException(400, "Invalid OTP")
    user.is_verified = True
    user.otp_code = None
    db.commit()
    return TokenOut(access_token=create_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_verified:
        raise HTTPException(403, "Please verify your email first")
    if user.status == "suspended":
        raise HTTPException(403, "Your account has been suspended. Please contact support.")
    return TokenOut(access_token=create_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut(
        id=user.id, email=user.email, plan=user.plan,
        is_verified=user.is_verified, has_profile=user.profile is not None,
        phone=user.phone, phone_verified=user.phone_verified,
    )


@router.post("/change-password")
def change_password(data: PasswordChangeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed"}


@router.put("/phone")
def set_phone(data: PhoneIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Save/change the mobile number. A changed number has to be verified again."""
    if data.phone != user.phone:
        user.phone = data.phone
        user.phone_verified = False
        user.mobile_otp = None
        db.commit()
    return {"phone": user.phone, "phone_verified": user.phone_verified}


@router.post("/mobile-otp/send")
def send_mobile_otp(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.phone:
        raise HTTPException(400, "Add your mobile number first")
    user.mobile_otp = _new_otp()
    db.commit()
    try:
        send_sms(user.phone, f"Your Cedar Matrimony mobile verification code is {user.mobile_otp}")
    except Exception:
        log.exception("Could not send SMS to %s", user.phone)
        raise HTTPException(502, "Could not send the SMS. Please try again in a moment.")
    return {"message": "Verification code sent to your mobile number."}


@router.post("/mobile-otp/verify")
def verify_mobile_otp(data: CodeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.mobile_otp or not secrets.compare_digest(user.mobile_otp, data.code):
        raise HTTPException(400, "Invalid code")
    user.phone_verified = True
    user.mobile_otp = None
    db.commit()
    return {"phone_verified": True}
