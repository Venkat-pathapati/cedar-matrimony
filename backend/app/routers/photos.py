"""Profile photos. Files are re-encoded (EXIF/GPS removed), stored privately on disk and only
served to logged-in members through GET /api/photos/{id}/file."""
import io
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Photo, User
from ..security import current_user

router = APIRouter(prefix="/api/photos", tags=["photos"])
Image.MAX_IMAGE_PIXELS = 40_000_000  # reject decompression bombs


def _clean_image(raw: bytes) -> bytes:
    """Check it really is a JPEG/PNG/WebP, drop EXIF, cap the size, re-encode as JPEG."""
    try:
        Image.open(io.BytesIO(raw)).verify()
        im = Image.open(io.BytesIO(raw))
        if im.format not in ("JPEG", "PNG", "WEBP"):
            raise ValueError("format")
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((1280, 1280))
        out = io.BytesIO()
        im.save(out, "JPEG", quality=85, optimize=True)
        return out.getvalue()
    except Exception:
        raise HTTPException(400, "Please upload a valid JPEG, PNG or WebP image")


def _path(ph: Photo) -> Path:
    return Path(settings.upload_dir) / ph.filename


def _dict(ph: Photo) -> dict:
    return {"id": ph.id, "position": ph.position, "status": ph.status}


def _own(db: Session, user: User, photo_id: int) -> Photo:
    ph = db.get(Photo, photo_id)
    if not ph or ph.user_id != user.id:
        raise HTTPException(404, "Photo not found")
    return ph


def _renumber(photos: list[Photo]) -> None:
    for i, ph in enumerate(photos):
        ph.position = i


@router.get("/mine")
def my_photos(user: User = Depends(current_user)):
    return [_dict(p) for p in user.photos]


@router.post("", status_code=201)
def upload_photo(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if len(user.photos) >= settings.max_photos_per_user:
        raise HTTPException(400, f"You can upload up to {settings.max_photos_per_user} photos")
    raw = file.file.read(settings.max_photo_bytes + 1)
    if len(raw) > settings.max_photo_bytes:
        raise HTTPException(413, f"Photo is too large (max {settings.max_photo_bytes // (1024 * 1024)} MB)")
    data = _clean_image(raw)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_hex(16)}.jpg"
    (Path(settings.upload_dir) / name).write_bytes(data)
    ph = Photo(user_id=user.id, filename=name, position=len(user.photos))
    db.add(ph)
    db.commit()
    return _dict(ph)


@router.put("/{photo_id}/main")
def make_main(photo_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ph = _own(db, user, photo_id)
    _renumber([ph] + [p for p in user.photos if p.id != ph.id])
    db.commit()
    return {"message": "Main photo updated"}


@router.delete("/{photo_id}")
def delete_photo(photo_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ph = _own(db, user, photo_id)
    path = _path(ph)
    user.photos.remove(ph)
    db.flush()
    _renumber(list(user.photos))
    db.commit()
    path.unlink(missing_ok=True)
    return {"message": "Photo deleted"}


@router.get("/{photo_id}/file")
def photo_file(photo_id: int, viewer: User = Depends(current_user), db: Session = Depends(get_db)):
    """Owner always; other members only when the owner's profile has been approved and the photo was not rejected."""
    ph = db.get(Photo, photo_id)
    if not ph:
        raise HTTPException(404, "Photo not found")
    owner = db.get(User, ph.user_id)
    if ph.user_id != viewer.id and not (owner and owner.profile and owner.profile.verified and ph.status != "rejected"):
        raise HTTPException(404, "Photo not found")
    path = _path(ph)
    if not path.exists():
        raise HTTPException(404, "Photo not found")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})
