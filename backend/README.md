# Cedar Matrimony – Backend (FastAPI)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs
## Email verification (SMTP)
Open `app/config.py` and paste your email and password into `smtp_email` and `smtp_password`
(or set `SMTP_EMAIL` / `SMTP_PASSWORD` in `.env`). For Gmail, turn on 2-Step Verification and
create an **App Password** (Google Account -> Security -> App passwords); use that, not your normal password.
Until you fill them in, the code is just printed in the terminal.
Do not commit your real password to Git; the `.env` file is the safer place for it.
