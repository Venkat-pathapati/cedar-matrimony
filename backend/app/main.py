from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import activity, auth, content, messages, photos, profiles
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # use Alembic migrations in production
    seed()
    yield


app = FastAPI(title="Cedar Matrimony API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(photos.router)
app.include_router(messages.router)
app.include_router(activity.router)
app.include_router(content.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
