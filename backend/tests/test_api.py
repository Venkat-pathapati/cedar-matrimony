"""End-to-end API test: run with `pytest -q` from the backend folder (uses a throw-away database)."""
import io
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Profile, User  # noqa: E402
from app.routers import activity, messages, profiles  # noqa: E402

SENT: list[dict] = []


def _capture(to, subject, headline, line, link_path, button):
    SENT.append(dict(to=to, subject=subject, line=line, link=link_path))


@pytest.fixture(scope="module")
def client():
    for mod in (profiles, activity, messages):
        mod.notify_member = _capture
    with TestClient(app) as c:
        yield c


def signup(c, email, first, last, gender, dob="1996-05-10"):
    assert c.post("/api/auth/register", json={"email": email, "password": "password123"}).status_code == 201
    with SessionLocal() as db:
        otp = db.query(User).filter_by(email=email).one().otp_code
    tok = c.post("/api/auth/verify-otp", json={"email": email, "code": otp}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    r = c.patch("/api/profiles/me", headers=h, json=dict(
        first_name=first, last_name=last, gender=gender, date_of_birth=dob, city="Hyderabad", denomination="Baptist",
        occupation="Engineer", education="B.Tech", hobbies="Reading", fitness="Yoga", interests=["Music", " Travel ", ""],
        pref_age_min=25, pref_age_max=30, pref_education="Graduate", pref_location="Hyderabad", pref_qualities="Kind"))
    assert r.status_code == 200, r.text
    return h, r.json()


def approve(pid):
    with SessionLocal() as db:
        db.get(Profile, pid).verified = True
        db.commit()


def test_public_endpoints(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    assert len(client.get("/api/plans").json()) == 4
    assert client.get("/api/stories").status_code == 200
    feat = client.get("/api/profiles/featured").json()
    assert len(feat) == 4 and feat[0]["name"] == "Anusha"
    assert client.post("/api/contact", json={"name": "A", "email": "a@b.co", "message": "hello there"}).status_code == 201


def test_new_profile_fields_roundtrip(client):
    h, me = signup(client, "she@example.com", "Mary", "John", "female")
    assert me["interests"] == ["Music", "Travel"] and me["pref_age_min"] == 25 and me["hobbies"] == "Reading"
    assert client.patch("/api/profiles/me", headers=h, json={"pref_age_min": 40, "pref_age_max": 30}).status_code == 422
    assert client.get("/api/profiles/me", headers=h).json()["fitness"] == "Yoga"


def test_demo_profile_has_gallery_lifestyle_preferences(client):
    h, me = signup(client, "he@example.com", "Paul", "Mathew", "male", "1994-02-02")
    approve(me["id"])
    with SessionLocal() as db:
        demo = db.query(Profile).filter_by(name="Anusha Kumar").one().id
    d = client.get(f"/api/profiles/{demo}", headers=h).json()
    assert len(d["gallery_urls"]) == 5 and d["hobbies"] and d["fitness"] and d["interests"] and d["pref_qualities"]
    assert d["father_occupation"] and d["eating_habit"]
    for url in d["gallery_urls"]:                       # the files really exist in the frontend
        assert os.path.exists(os.path.join("..", "frontend", "public", url.lstrip("/"))), url


def test_interest_message_notifications(client):
    h1, p1 = signup(client, "a1@example.com", "Ruth", "Kumar", "female", "1997-01-01")
    h2, p2 = signup(client, "b1@example.com", "Joel", "Raj", "male", "1995-01-01")
    approve(p1["id"]); approve(p2["id"])
    SENT.clear()
    assert client.post(f"/api/profiles/{p1['id']}/interest", headers=h2).status_code == 201
    assert client.post(f"/api/profiles/{p1['id']}/interest", headers=h2).status_code == 409
    assert SENT[-1]["to"] == "a1@example.com" and "Joel" in SENT[-1]["subject"]          # email to the receiver
    assert client.get("/api/notifications/summary", headers=h1).json()["pending_interests"] == 1  # bell badge
    iid = client.get("/api/interests/received", headers=h1).json()[0]["id"]
    assert client.post(f"/api/interests/{iid}/accept", headers=h1).status_code == 200
    assert SENT[-1]["to"] == "b1@example.com" and "accepted" in SENT[-1]["subject"]
    assert client.get("/api/notifications/summary", headers=h2).json()["accepted_unseen"] == 1
    # messages
    assert client.post(f"/api/messages/with/{p1['id']}", headers=h2, json={"body": "Hello Ruth"}).status_code == 201
    assert SENT[-1]["to"] == "a1@example.com" and "New message" in SENT[-1]["subject"]
    assert client.get("/api/notifications/summary", headers=h1).json()["unread_messages"] == 1
    t = client.get(f"/api/messages/with/{p2['id']}", headers=h1).json()
    assert t["messages"][0]["body"] == "Hello Ruth"
    assert client.get("/api/messages/conversations", headers=h1).status_code == 200
    assert client.get("/api/messages/unread-count", headers=h1).json()["count"] == 0
    # shortlist
    assert client.post(f"/api/profiles/{p1['id']}/shortlist", headers=h2).status_code == 201
    assert len(client.get("/api/shortlist", headers=h2).json()) == 1
    assert client.delete(f"/api/profiles/{p1['id']}/shortlist", headers=h2).status_code == 200
    assert client.get("/api/profiles", headers=h2).status_code == 200


def test_photos_upload_and_view(client):
    h, me = signup(client, "ph@example.com", "Anna", "Mary", "female", "1998-03-03")
    buf = io.BytesIO(); Image.new("RGB", (200, 200), "red").save(buf, "PNG")
    ids = [client.post("/api/photos", headers=h, files={"file": ("a.png", buf.getvalue(), "image/png")}).json()["id"] for _ in range(2)]
    d = client.get(f"/api/profiles/{me['id']}", headers=h).json()
    assert d["photo_ids"] == ids and d["is_me"]
    assert client.get(f"/api/photos/{ids[0]}/file", headers=h).status_code == 200
    assert client.get("/api/profiles/me/completeness", headers=h).json()["percent"] > 0
    assert client.delete(f"/api/photos/{ids[1]}", headers=h).status_code == 200
