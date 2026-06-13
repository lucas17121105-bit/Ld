"""Backend tests for LD vôlei app (VôleiPro API)."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "voleipro_db")

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    token = f"TEST_admin_{uuid.uuid4().hex}"
    user_id = f"TEST_user_{uuid.uuid4().hex[:10]}"
    email = f"test_admin_{uuid.uuid4().hex[:6]}@test.local"
    db.users.insert_one({
        "user_id": user_id, "email": email, "name": "Test Admin",
        "picture": None, "role": "admin",
        "created_at": datetime.now(timezone.utc),
    })
    db.user_sessions.insert_one({
        "session_token": token, "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"token": token, "user_id": user_id, "email": email}
    db.user_sessions.delete_one({"session_token": token})
    db.users.delete_one({"user_id": user_id})
    db.exercises.delete_many({"created_by": user_id})
    db.training_plans.delete_many({"created_by": user_id})


@pytest.fixture(scope="session")
def student_session():
    token = f"TEST_student_{uuid.uuid4().hex}"
    user_id = f"TEST_user_{uuid.uuid4().hex[:10]}"
    email = f"test_student_{uuid.uuid4().hex[:6]}@test.local"
    db.users.insert_one({
        "user_id": user_id, "email": email, "name": "Test Student",
        "picture": None, "role": "student",
        "created_at": datetime.now(timezone.utc),
    })
    db.user_sessions.insert_one({
        "session_token": token, "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"token": token, "user_id": user_id, "email": email}
    db.user_sessions.delete_one({"session_token": token})
    db.users.delete_one({"user_id": user_id})
    db.progress.delete_many({"user_id": user_id})
    db.training_plans.delete_many({"student_id": user_id})


def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- health & public ----------
def test_root_ok():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert "VôleiPro" in body.get("service", "")


def test_categories_six():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    keys = {c["key"] for c in cats}
    assert keys == {"saque", "manchete", "toque", "ataque", "bloqueio", "condicionamento"}


# ---------- auth required ----------
def test_exercises_requires_auth():
    r = requests.get(f"{API}/exercises")
    assert r.status_code == 401


def test_google_auth_invalid_session():
    r = requests.post(f"{API}/auth/google", json={"session_id": "invalid_xyz"})
    assert r.status_code == 401


# ---------- RBAC: admin endpoints without token / as student ----------
@pytest.mark.parametrize("path,method,payload", [
    ("/admin/stats", "GET", None),
    ("/students", "GET", None),
    ("/exercises", "POST", {"title": "x", "category": "saque", "video_url": "u"}),
    ("/plans", "POST", {"student_id": "x", "title": "y"}),
])
def test_admin_endpoints_no_token(path, method, payload):
    fn = requests.get if method == "GET" else requests.post
    r = fn(f"{API}{path}", json=payload) if payload else fn(f"{API}{path}")
    assert r.status_code == 401, f"{path} expected 401 got {r.status_code}"


@pytest.mark.parametrize("path,method,payload", [
    ("/admin/stats", "GET", None),
    ("/students", "GET", None),
    ("/exercises", "POST", {"title": "x", "category": "saque", "video_url": "u"}),
    ("/plans", "POST", {"student_id": "x", "title": "y"}),
])
def test_admin_endpoints_student_forbidden(student_session, path, method, payload):
    hdr = h(student_session["token"])
    fn = requests.get if method == "GET" else requests.post
    r = fn(f"{API}{path}", headers=hdr, json=payload) if payload else fn(f"{API}{path}", headers=hdr)
    assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"


# ---------- authenticated flow ----------
def test_auth_me_admin(admin_session):
    r = requests.get(f"{API}/auth/me", headers=h(admin_session["token"]))
    assert r.status_code == 200
    me = r.json()
    assert me["role"] == "admin"
    assert me["email"] == admin_session["email"]


def test_admin_can_list_students(admin_session, student_session):
    r = requests.get(f"{API}/students", headers=h(admin_session["token"]))
    assert r.status_code == 200
    ids = {s["user_id"] for s in r.json()}
    assert student_session["user_id"] in ids


def test_create_exercise_and_list(admin_session):
    payload = {"title": "TEST_Saque", "description": "d", "category": "saque",
               "video_url": "https://youtu.be/abc", "duration_seconds": 60}
    r = requests.post(f"{API}/exercises", headers=h(admin_session["token"]), json=payload)
    assert r.status_code == 200
    ex = r.json()
    assert ex["title"] == "TEST_Saque"
    assert ex["category"] == "saque"
    assert "id" in ex

    # list filter
    r2 = requests.get(f"{API}/exercises?category=saque",
                      headers=h(admin_session["token"]))
    assert r2.status_code == 200
    assert any(e["id"] == ex["id"] for e in r2.json())

    # GET single
    r3 = requests.get(f"{API}/exercises/{ex['id']}", headers=h(admin_session["token"]))
    assert r3.status_code == 200
    assert r3.json()["id"] == ex["id"]


def test_exercise_requires_video(admin_session):
    r = requests.post(f"{API}/exercises", headers=h(admin_session["token"]),
                      json={"title": "no_vid", "category": "saque"})
    assert r.status_code == 400


def test_plan_progress_and_stats(admin_session, student_session):
    # create exercise
    r = requests.post(f"{API}/exercises", headers=h(admin_session["token"]),
                      json={"title": "TEST_Plan_Ex", "category": "toque",
                            "video_url": "https://youtu.be/xyz"})
    assert r.status_code == 200
    ex_id = r.json()["id"]

    # create plan for student
    plan_payload = {
        "student_id": student_session["user_id"],
        "title": "TEST_Plan",
        "items": [{"exercise_id": ex_id, "sets": 3, "reps": 10, "notes": ""}],
    }
    r2 = requests.post(f"{API}/plans", headers=h(admin_session["token"]), json=plan_payload)
    assert r2.status_code == 200
    plan_id = r2.json()["id"]

    # student lists own plans
    r3 = requests.get(f"{API}/plans/me", headers=h(student_session["token"]))
    assert r3.status_code == 200
    assert any(p["id"] == plan_id for p in r3.json())

    # student fetches plan detail
    r3b = requests.get(f"{API}/plans/{plan_id}", headers=h(student_session["token"]))
    assert r3b.status_code == 200

    # student adds progress
    r4 = requests.post(f"{API}/progress", headers=h(student_session["token"]),
                       json={"exercise_id": ex_id, "plan_id": plan_id})
    assert r4.status_code == 200
    assert r4.json()["exercise_id"] == ex_id

    # student stats
    r5 = requests.get(f"{API}/users/me/stats", headers=h(student_session["token"]))
    assert r5.status_code == 200
    s = r5.json()
    assert s["total_completed"] >= 1
    assert s["completed_last_7_days"] >= 1

    # admin stats
    r6 = requests.get(f"{API}/admin/stats", headers=h(admin_session["token"]))
    assert r6.status_code == 200
    a = r6.json()
    for k in ("students", "admins", "exercises", "plans", "completions"):
        assert k in a


def test_invalid_token_unauthorized():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer bogus_xxx"})
    assert r.status_code == 401
