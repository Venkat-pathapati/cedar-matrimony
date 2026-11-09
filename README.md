# Cedar Matrimony

- `backend/`   – the website API (FastAPI + SQLAlchemy, SQLite by default) → port **8000**
- `frontend/`  – the website (Next.js 14) → port **3000**
- `dashboard/frontend/` – the admin dashboard (Next.js 14) → port **3001**
- `dashboard/backend/`  – the admin dashboard API (FastAPI) → port **8001**, its own app, using the same database file as `backend/`

| What | Folder | Command (run inside the folder) | URL |
|---|---|---|---|
| Website API | `backend` | `python -m uvicorn app.main:app --reload --port 8000` | http://localhost:8000/docs |
| Dashboard API | `dashboard/backend` | `python -m uvicorn app.main:app --reload --port 8001` | http://localhost:8001/docs |
| Website | `frontend` | `npm install` then `npm run dev` | http://localhost:3000 |
| Dashboard | `dashboard/frontend` | `npm install` then `npm run dev` | http://localhost:3001 |

Use four terminals. Setup per folder: copy `.env.example` → `.env` (both backends) and `.env.local.example` → `.env.local` (both frontends).
The two backends are separate apps (each has its own virtual environment / `pip install -r requirements.txt`) but use the same database and `uploads/` folder:
`dashboard/backend` points at `../../backend/cedar.db` and `../../backend/uploads` by default. If you change `DATABASE_URL`, `UPLOAD_DIR` or `SECRET_KEY` in `backend/.env`, change them the same way in `dashboard/backend/.env`.
The dashboard's data model (`dashboard/backend/app/models.py`) is a copy of the website's: if you add a column to one, add it to the other.

## Admin dashboard (how it is connected to the website)
- It reads and writes the **same database** as the website, so every member who registers on the website appears in the dashboard straight away
  (all details, photos, interests, matches, contact-form messages), and everything you change in the dashboard is what the website shows.
- Sign in at http://localhost:3001 with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `dashboard/backend/.env` (defaults: `admin@matrimony.com` / `Admin@4949` – change them).
  The password is only read when the admin account is first created. Change it later in Dashboard → Settings, or reset it with `python -m app.reset_admin` (run in `dashboard/backend`).
- **Review flow:** a new profile is *pending* and is hidden from other members until you **Approve** it. *Request changes* / *Reject* hide it and the
  member sees your note on their profile; when they save their profile again it returns to the pending queue. Members get an email for each decision (needs SMTP).
- **Photos:** every upload starts as *pending* in Photo review. A *rejected* photo is hidden from other members. Admins can open every photo.
- **Accounts:** *Suspend* blocks login and ends the member's session on the next request. *Set plan* grants Free / Silver / Gold / Platinum for N months
  (an expired plan counts as Free).
- Member numbers look like `CM000012` and are the profile id, so they never change. The sample members (Anusha, Rahul, Sneha, David) have no login account;
  their photos come from the website's `public/profiles` folder.
- Dashboard API (all under `/api/v1`, admin token required): `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/password/change`,
  `GET /admin/dashboard`, `/admin/stats`, `/admin/members` (+ `GET/PUT/DELETE /admin/members/{id}`, `POST /admin/members`),
  `POST /admin/profiles/{id}/approve|reject|request-changes`, `GET /admin/photos`, `POST /admin/photos/{id}/approve|reject`, `DELETE /admin/photos/{id}`,
  `GET /photos/{id}/file`, `GET/DELETE /admin/matches`, `GET /admin/reports`, `POST /admin/reports/{id}/resolve`, `DELETE /admin/reports/{id}`,
  `POST /admin/users/{id}/suspend|reactivate|plan`, `GET /admin/audit`, `GET/DELETE /admin/enquiries`.
- New website endpoints added for it: `POST /api/profiles/{id}/report`, `PUT /api/profiles/me/visibility`; `/api/profiles/me` now also returns
  `approval_status` and `admin_notes`.
- An existing `cedar.db` is upgraded automatically on the next start (new columns are added; profiles that were already verified become *approved*).

## Deploying (GitHub / hosting)
Nothing is hard-coded to localhost. Set these per environment:
- Frontend: `NEXT_PUBLIC_API_URL` (browser -> API) and `API_URL` (server -> API), see `frontend/.env.local.example`
- Backend (`backend/.env`): `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (your frontend URL), `SITE_URL` (links inside emails),
  `SMTP_EMAIL` / `SMTP_PASSWORD` (Gmail App Password). **Without SMTP the notification emails are skipped** (the in-app bell still works).

## API endpoints (interactive docs at `/docs`)
- Auth: `POST /api/auth/register`, `/verify-otp`, `/resend-otp`, `/login`, `/change-password`; `GET /api/auth/me`; `PUT /api/auth/phone`; `POST /api/auth/mobile-otp/send`, `/mobile-otp/verify`
- Profiles: `GET/PUT/PATCH /api/profiles/me`, `GET /api/profiles/me/completeness`, `GET /api/profiles` (browse), `GET /api/profiles/featured`, `GET /api/profiles/{id}`
- Interests / shortlist: `POST /api/profiles/{id}/interest`, `POST/DELETE /api/profiles/{id}/shortlist`, `GET /api/shortlist`, `GET /api/interests/received`, `/interests/sent`, `POST /api/interests/seen`, `/interests/{id}/accept`, `/interests/{id}/decline`
- Messages: `GET /api/messages/conversations`, `/messages/unread-count`, `GET/POST /api/messages/with/{profile_id}`
- Notifications: `GET /api/notifications/summary` (bell counts); emails are sent on interest received, interest accepted, new message
- Photos: `POST /api/photos`, `GET /api/photos/mine`, `GET /api/photos/{id}/file`, `PUT /api/photos/{id}/main`, `DELETE /api/photos/{id}`
- Content: `GET /api/plans`, `GET /api/stories`, `POST /api/contact`, `GET /api/health`

Run the API tests: `cd backend && pip install pytest httpx && pytest -q`
