"""Sends emails through your SMTP account (credentials live in app/config.py or .env)."""
import smtplib
import ssl
from email.message import EmailMessage

from .config import settings

PLACEHOLDERS = {"your-email@gmail.com", "your-app-password", ""}


def smtp_configured() -> bool:
    return settings.smtp_email not in PLACEHOLDERS and settings.smtp_password not in PLACEHOLDERS


def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Raises smtplib.SMTPException / OSError on failure."""
    msg = EmailMessage()
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    ctx = ssl.create_default_context()
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=ctx, timeout=20) as s:
            s.login(settings.smtp_email, settings.smtp_password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
            s.starttls(context=ctx)
            s.login(settings.smtp_email, settings.smtp_password)
            s.send_message(msg)


def send_verification_code(to: str, code: str) -> None:
    text = (
        f"Welcome to Cedar Matrimony!\n\n"
        f"Your email verification code is: {code}\n\n"
        f"Enter this code on the website to finish creating your profile.\n"
        f"If you did not sign up, you can ignore this email."
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #E7E1D3;border-radius:12px">
      <h2 style="color:#0B2A55;margin-top:0">Welcome to Cedar Matrimony</h2>
      <p>Use this code to verify your email address:</p>
      <p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#0B2A55;margin:16px 0">{code}</p>
      <p style="color:#566275;font-size:14px">If you did not sign up, you can safely ignore this email.</p>
    </div>"""
    send_email(to, "Your Cedar Matrimony verification code", text, html)


def notify_member(to: str | None, subject: str, headline: str, line: str, link_path: str, button: str) -> None:
    """Short 'something happened' email. Silently skipped when SMTP is not set up or the member has no email."""
    if not to or not smtp_configured():
        return
    link = settings.site_url.rstrip("/") + link_path
    text = f"{headline}\n\n{line}\n\n{button}: {link}\n\n- Cedar Matrimony"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #E7E1D3;border-radius:12px">
      <h2 style="color:#0E3B2A;margin-top:0">{headline}</h2>
      <p style="color:#3C4A41;font-size:15px;line-height:1.6">{line}</p>
      <p><a href="{link}" style="display:inline-block;background:#C79A3B;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">{button}</a></p>
      <p style="color:#6B7280;font-size:12px">You are receiving this because you have a profile on Cedar Matrimony.</p>
    </div>"""
    try:
        send_email(to, subject, text, html)
    except Exception:  # a failed notification must never break the action that triggered it
        pass
