from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import close_db, get_db, init_db
from .migrations.forms import ensure_form_collections
from .routers.auth import router as auth_router
from .routers.forms import router as forms_router
from .routers.health import router as health_router
from .routers.stt import router as stt_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()
    # Run lightweight "migrations" when Mongo is available (creates collections/indexes).
    try:
        db = get_db()
    except RuntimeError:
        db = None
    if db is not None:
        await ensure_form_collections(db)


@app.on_event("shutdown")
async def shutdown():
    await close_db()


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(forms_router)
app.include_router(stt_router)