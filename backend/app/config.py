from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# website backend folder (independent of the folder uvicorn is started from)
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./cedar.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:3000"
    site_url: str = "http://localhost:3000"   # used for links inside notification emails

    # Messaging: set CHAT_REQUIRES_PAID_PLAN=true in .env once plan upgrades/payments work
    # (the Free plan card says "Chat with Matches" is not included).
    chat_requires_paid_plan: bool = False
    chat_messages_per_hour: int = 60

    # Profile photos (stored privately on disk, never served as static files)
    upload_dir: str = "uploads"
    max_photos_per_user: int = 6
    max_photo_bytes: int = 5 * 1024 * 1024

    # ------------------------------------------------------------------
    # EMAIL (SMTP) — used to send the verification code after registration
    # ------------------------------------------------------------------
    # >>> PASTE YOUR EMAIL AND PASSWORD HERE (or put them in backend/.env) <<<
    smtp_email: str = "your-email@gmail.com"        # the mail account that sends the code
    smtp_password: str = "your-app-password"        # Gmail: a 16-character "App Password", not your normal password
    # Server settings — defaults are for Gmail. Other providers:
    #   Outlook/Office365: smtp.office365.com, port 587
    #   Yahoo:             smtp.mail.yahoo.com, port 587
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587                             # 587 = STARTTLS, 465 = SSL
    smtp_from_name: str = "Cedar Matrimony"

    # ------------------------------------------------------------------
    # ADMIN DASHBOARD (frontend http://localhost:3001, API http://localhost:8001)
    # The admin account is created / synced from these values on every start. Change the password in backend/.env.
    # ------------------------------------------------------------------
    admin_email: str = "admin@matrimony.com"
    admin_phone: str = "9999999999"
    admin_password: str = "Admin@4949"
    admin_token_minutes: int = 60 * 12                        # dashboard sessions are shorter than member sessions
    admin_cors_origins: str = "http://localhost:3001"         # dashboard frontend URL(s), comma separated

    @model_validator(mode="after")
    def _resolve_paths(self):
        """Resolve relative DATABASE_URL / UPLOAD_DIR from this backend folder (not the current working
        directory) so the website and the dashboard always open the very same database file."""
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix) and ":memory:" not in self.database_url:
            db_path = Path(self.database_url[len(prefix):])
            if not db_path.is_absolute():
                db_path = (BACKEND_DIR / db_path).resolve()
            db_path.parent.mkdir(parents=True, exist_ok=True)
            self.database_url = prefix + db_path.as_posix()
        up = Path(self.upload_dir)
        if not up.is_absolute():
            up = (BACKEND_DIR / up).resolve()
        self.upload_dir = str(up)
        return self


settings = Settings()
