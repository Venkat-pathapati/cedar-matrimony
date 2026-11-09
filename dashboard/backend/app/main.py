"""Admin dashboard API.   Run from dashboard/backend:   python -m uvicorn app.main:app --reload --port 8001

Same database and uploads as the website API (app.main on port 8000), so the dashboard always shows live data.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin
from .seed import ensure_admin


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()        # same tables as the website; safe to start in either order, or both at once
    ensure_admin()   # creates the admin account from backend/.env if there is none yet
    yield


app = FastAPI(title="Cedar Matrimony Admin API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.admin_cors_origins.split(",") if o.strip()],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",  # any local port while developing
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.auth_router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "admin"}
