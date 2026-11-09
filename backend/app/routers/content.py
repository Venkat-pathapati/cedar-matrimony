from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ContactMessage, Plan, Story
from ..schemas import ContactIn, PlanOut, StoryOut

router = APIRouter(prefix="/api", tags=["content"])


@router.get("/plans", response_model=list[PlanOut])
def plans(db: Session = Depends(get_db)):
    return db.scalars(select(Plan).order_by(Plan.sort_order)).all()


@router.get("/stories", response_model=list[StoryOut])
def stories(db: Session = Depends(get_db)):
    return db.scalars(select(Story).where(Story.published.is_(True))).all()


@router.post("/contact", status_code=201)
def contact(data: ContactIn, db: Session = Depends(get_db)):
    db.add(ContactMessage(**data.model_dump()))
    db.commit()
    return {"message": "Thank you. We will get back to you soon."}
