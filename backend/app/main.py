import logging
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import account, admin, auth, catalog, orders
from app.core.config import settings

app = FastAPI(title="Aks.pk API", version="0.1.0", docs_url="/docs" if settings.env != "production" else None)

app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.env == "production" and "console" in (settings.email_provider, settings.sms_provider):
    logging.getLogger("aks").warning("EMAIL_PROVIDER/SMS_PROVIDER is 'console': verification codes are only written to the log.")

api = APIRouter(prefix="/api/v1")
for module in (auth, catalog, orders, account, admin):
    api.include_router(module.router)
app.include_router(api)


@app.get("/health")
async def health():
    return {"ok": True}


if not settings.r2_enabled:
    Path(settings.media_dir).mkdir(exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.media_dir, html=False), name="media")
