"""VôleiPro backend — FastAPI + MongoDB + Emergent Google Auth."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

EMERGENT_SESSION_DATA_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

app = FastAPI(title="VôleiPro API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("voleipro")


# ============ MODELS ============
class GoogleAuthRequest(BaseModel):
    session_id: str


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Literal["student", "admin"] = "student"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reset_at: Optional[datetime] = None


class Category(BaseModel):
    key: str
    label: str
    description: str
    image_url: Optional[str] = None


class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    category: str
    video_url: Optional[str] = None  # YouTube/Vimeo link
    video_base64: Optional[str] = None  # uploaded data URI / base64
    thumbnail_url: Optional[str] = None
    duration_seconds: int = 0
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExerciseCreate(BaseModel):
    title: str
    description: str = ""
    category: str
    video_url: Optional[str] = None
    video_base64: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: int = 0


class PlanItem(BaseModel):
    exercise_id: str
    sets: int = 1
    reps: int = 10
    notes: str = ""


class TrainingPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    title: str
    description: str = ""
    items: List[PlanItem] = []
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrainingPlanCreate(BaseModel):
    student_id: str
    title: str
    description: str = ""
    items: List[PlanItem] = []
    is_active: bool = True


class ProgressEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exercise_id: str
    plan_id: Optional[str] = None
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProgressCreate(BaseModel):
    exercise_id: str
    plan_id: Optional[str] = None


class StreakEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    week_start: datetime


# ============ HELPERS ============
def _normalize_dt(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one(
        {"session_token": token}, {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if _normalize_dt(session["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return user


CATEGORIES: List[Category] = [
    Category(key="saque", label="Saque", description="Técnicas de saque",
             image_url="https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=600"),
    Category(key="manchete", label="Manchete", description="Recepção e manchete",
             image_url="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600"),
    Category(key="toque", label="Toque", description="Levantamento e toque",
             image_url="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600"),
    Category(key="ataque", label="Ataque", description="Cortada e ataque",
             image_url="https://images.unsplash.com/photo-1765910226872-e8811bd45d3e?w=600"),
    Category(key="bloqueio", label="Bloqueio", description="Bloqueio na rede",
             image_url="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600"),
    Category(key="condicionamento", label="Condicionamento", description="Preparo físico",
             image_url="https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=600"),
]


SAMPLE_EXERCISES = [
    {"title": "Saque por Cima — Fundamentos", "category": "saque",
     "description": "Postura, lançamento da bola e contato com a mão aberta.",
     "video_url": "https://www.youtube.com/watch?v=B0u-Be8Pqv4",
     "thumbnail_url": "https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=800",
     "duration_seconds": 240},
    {"title": "Saque Flutuante", "category": "saque",
     "description": "Técnica de saque sem rotação para dificultar a recepção.",
     "video_url": "https://www.youtube.com/watch?v=I7VbtPnZbDw",
     "thumbnail_url": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800",
     "duration_seconds": 300},
    {"title": "Manchete — Postura Base", "category": "manchete",
     "description": "Aprenda a postura correta para uma manchete firme.",
     "video_url": "https://www.youtube.com/watch?v=tEhvYHmsAXk",
     "thumbnail_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
     "duration_seconds": 360},
    {"title": "Toque de Levantamento", "category": "toque",
     "description": "Posicionamento das mãos e direcionamento da bola.",
     "video_url": "https://www.youtube.com/watch?v=4kKqQbZxYpA",
     "thumbnail_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
     "duration_seconds": 300},
    {"title": "Cortada — Aproximação e Salto", "category": "ataque",
     "description": "Os 3 passos clássicos da aproximação para ataque.",
     "video_url": "https://www.youtube.com/watch?v=2qZQ9_BlqkM",
     "thumbnail_url": "https://images.unsplash.com/photo-1765910226872-e8811bd45d3e?w=800",
     "duration_seconds": 420},
    {"title": "Bloqueio Individual", "category": "bloqueio",
     "description": "Leitura do ataque e posicionamento das mãos na rede.",
     "video_url": "https://www.youtube.com/watch?v=8tPnX0LFc7M",
     "thumbnail_url": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800",
     "duration_seconds": 300},
    {"title": "Pliometria para Salto Vertical", "category": "condicionamento",
     "description": "Série de exercícios pliométricos para aumentar a impulsão.",
     "video_url": "https://www.youtube.com/watch?v=YnXvR6n7QTw",
     "thumbnail_url": "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=800",
     "duration_seconds": 600},
    {"title": "Core para Voleibolistas", "category": "condicionamento",
     "description": "Fortalecimento do core para estabilidade no ataque.",
     "video_url": "https://www.youtube.com/watch?v=DHD1-2P94DI",
     "thumbnail_url": "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=800",
     "duration_seconds": 480},
]


# ============ STARTUP ============
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.exercises.create_index("category")
    await db.training_plans.create_index("student_id")
    await db.progress.create_index([("user_id", 1), ("completed_at", -1)])
    await db.streaks.create_index([("user_id", 1), ("week_start", -1)])

    # Seed sample exercises if empty
    count = await db.exercises.count_documents({})
    if count == 0:
        for sample in SAMPLE_EXERCISES:
            ex = Exercise(**sample)
            await db.exercises.insert_one(ex.model_dump())
        logger.info("Seeded %d sample exercises", len(SAMPLE_EXERCISES))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============ AUTH ============
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthRequest):
    """Exchange Emergent session_id -> verified user + session token."""
    try:
        async with httpx.AsyncClient(timeout=15) as hx:
            resp = await hx.get(
                EMERGENT_SESSION_DATA_URL,
                headers={"X-Session-ID": payload.session_id},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Emergent session-data call failed")
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    email = (data.get("email") or "").lower()
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="Incomplete auth data")

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        # refresh name/picture in case changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
        role = existing.get("role", "student")
        # Promote to admin if email now in allowlist
        if email in ADMIN_EMAILS and role != "admin":
            await db.users.update_one(
                {"user_id": user_id}, {"$set": {"role": "admin"}}
            )
            role = "admin"
    else:
        # First registered email also becomes admin if no admin exists yet
        admin_count = await db.users.count_documents({"role": "admin"})
        role = "admin" if (email in ADMIN_EMAILS or admin_count == 0) else "student"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id, email=email, name=name, picture=picture, role=role
        )
        try:
            await db.users.insert_one(new_user.model_dump())
        except DuplicateKeyError:
            # Concurrent insert by another request — fetch the winner
            existing = await db.users.find_one({"email": email}, {"_id": 0})
            if not existing:
                raise HTTPException(status_code=500, detail="User upsert failed")
            user_id = existing["user_id"]

    # Create session (idempotent — same session_token may be returned on re-login)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "session_token": session_token,
                "user_id": user_id,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ============ CATEGORIES ============
@api_router.get("/categories")
async def list_categories():
    return [c.model_dump() for c in CATEGORIES]


# ============ EXERCISES ============
@api_router.get("/exercises")
async def list_exercises(
    category: Optional[str] = None, user: dict = Depends(get_current_user)
):
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    items = await db.exercises.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str, user: dict = Depends(get_current_user)):
    ex = await db.exercises.find_one({"id": exercise_id}, {"_id": 0})
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


@api_router.post("/exercises")
async def create_exercise(
    payload: ExerciseCreate, admin: dict = Depends(require_admin)
):
    if not payload.video_url and not payload.video_base64:
        raise HTTPException(status_code=400, detail="video_url ou video_base64 obrigatório")
    ex = Exercise(**payload.model_dump(), created_by=admin["user_id"])
    await db.exercises.insert_one(ex.model_dump())
    return ex.model_dump()


@api_router.put("/exercises/{exercise_id}")
async def update_exercise(
    exercise_id: str,
    payload: ExerciseCreate,
    admin: dict = Depends(require_admin),
):
    res = await db.exercises.update_one(
        {"id": exercise_id}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Exercise not found")
    ex = await db.exercises.find_one({"id": exercise_id}, {"_id": 0})
    return ex


@api_router.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str, admin: dict = Depends(require_admin)):
    res = await db.exercises.delete_one({"id": exercise_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"ok": True}


# ============ STUDENTS (admin) ============
@api_router.get("/students")
async def list_students(admin: dict = Depends(require_admin)):
    items = await db.users.find({"role": "student"}, {"_id": 0}).to_list(1000)
    return items


@api_router.get("/users/me/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    total = await db.progress.count_documents({"user_id": user["user_id"]})
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week = await db.progress.count_documents(
        {"user_id": user["user_id"], "completed_at": {"$gte": week_ago}}
    )
    return {"total_completed": total, "completed_last_7_days": week}


# ============ TRAINING PLANS ============
@api_router.get("/plans/me")
async def my_plans(user: dict = Depends(get_current_user)):
    items = await db.training_plans.find(
        {"student_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@api_router.get("/plans")
async def list_plans(
    student_id: Optional[str] = None, admin: dict = Depends(require_admin)
):
    query = {"student_id": student_id} if student_id else {}
    items = await db.training_plans.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/plans/{plan_id}")
async def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    plan = await db.training_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if user["role"] != "admin" and plan["student_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return plan


@api_router.post("/plans")
async def create_plan(payload: TrainingPlanCreate, admin: dict = Depends(require_admin)):
    student = await db.users.find_one({"user_id": payload.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    plan = TrainingPlan(**payload.model_dump(), created_by=admin["user_id"])
    await db.training_plans.insert_one(plan.model_dump())
    return plan.model_dump()


@api_router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    payload: TrainingPlanCreate,
    admin: dict = Depends(require_admin),
):
    res = await db.training_plans.update_one(
        {"id": plan_id}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = await db.training_plans.find_one({"id": plan_id}, {"_id": 0})
    return plan


@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, admin: dict = Depends(require_admin)):
    res = await db.training_plans.delete_one({"id": plan_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True}


# ============ PROGRESS ============
@api_router.post("/progress")
async def add_progress(payload: ProgressCreate, user: dict = Depends(get_current_user)):
    entry = ProgressEntry(
        user_id=user["user_id"],
        exercise_id=payload.exercise_id,
        plan_id=payload.plan_id,
    )
    await db.progress.insert_one(entry.model_dump())
    return entry.model_dump()


@api_router.get("/progress/me")
async def my_progress(user: dict = Depends(get_current_user)):
    items = await db.progress.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("completed_at", -1).to_list(200)
    return items


@api_router.get("/progress/student/{user_id}")
async def student_progress(user_id: str, admin: dict = Depends(require_admin)):
    items = await db.progress.find({"user_id": user_id}, {"_id": 0}).sort(
        "completed_at", -1
    ).to_list(500)
    return items


# ============ CYCLE & STREAK ============
async def _compute_cycle(user: dict) -> dict:
    last_reset = user.get("last_reset_at") or user.get("created_at")
    last_reset = _normalize_dt(last_reset)
    progress = await db.progress.find(
        {
            "user_id": user["user_id"],
            "completed_at": {"$gte": last_reset},
        },
        {"_id": 0},
    ).to_list(1000)
    completed_ids = sorted({p["exercise_id"] for p in progress})

    plans = await db.training_plans.find(
        {"student_id": user["user_id"], "is_active": True}, {"_id": 0}
    ).to_list(200)
    required_ids = sorted({it["exercise_id"] for p in plans for it in p["items"]})

    completed_set = set(completed_ids)
    all_done = len(required_ids) > 0 and all(rid in completed_set for rid in required_ids)
    return {
        "last_reset_at": last_reset,
        "completed_exercise_ids": completed_ids,
        "required_exercise_ids": required_ids,
        "all_done": all_done,
        "active_plan_count": len(plans),
    }


@api_router.get("/cycle/me")
async def get_cycle(user: dict = Depends(get_current_user)):
    return await _compute_cycle(user)


@api_router.post("/streak/complete-week")
async def complete_week(user: dict = Depends(get_current_user)):
    cycle = await _compute_cycle(user)
    if not cycle["all_done"]:
        raise HTTPException(
            status_code=400,
            detail="Ainda há exercícios pendentes nos seus treinos ativos.",
        )
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    entry = StreakEntry(user_id=user["user_id"], completed_at=now, week_start=week_start)
    await db.streaks.insert_one(entry.model_dump())
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$set": {"last_reset_at": now}}
    )
    total = await db.streaks.count_documents({"user_id": user["user_id"]})
    return {"entry": entry.model_dump(), "total_streaks": total}


@api_router.get("/streak/me")
async def streak_me(user: dict = Depends(get_current_user)):
    items = await db.streaks.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("week_start", -1).to_list(60)
    return items


# ============ ADMIN STATS ============
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    students = await db.users.count_documents({"role": "student"})
    admins = await db.users.count_documents({"role": "admin"})
    exercises = await db.exercises.count_documents({})
    plans = await db.training_plans.count_documents({})
    progress = await db.progress.count_documents({})
    return {
        "students": students,
        "admins": admins,
        "exercises": exercises,
        "plans": plans,
        "completions": progress,
    }


# ============ HEALTH ============
@api_router.get("/")
async def root():
    return {"service": "VôleiPro API", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
