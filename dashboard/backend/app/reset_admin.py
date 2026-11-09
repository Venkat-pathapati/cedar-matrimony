"""Reset the dashboard admin login to the ADMIN_EMAIL / ADMIN_PASSWORD in dashboard/backend/.env.

Run from the backend folder:   python -m app.reset_admin
"""
from sqlalchemy import select

from .config import settings
from .database import Base, add_missing_columns, engine, SessionLocal
from .models import User
from .security import hash_password


def main() -> None:
    Base.metadata.create_all(bind=engine)
    add_missing_columns()
    email = settings.admin_email.strip().lower()
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.is_admin.is_(True)).order_by(User.id))
        if admin is None:
            admin = User(email=email, phone=settings.admin_phone, password_hash="", is_verified=True,
                         phone_verified=True, is_admin=True, plan="Platinum")
            db.add(admin)
        admin.email = email
        admin.password_hash = hash_password(settings.admin_password)
        admin.status = "active"
        db.commit()
    print(f"Admin login reset: {email}")


if __name__ == "__main__":
    main()
