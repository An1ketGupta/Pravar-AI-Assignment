import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import engine
from app.routes import router

settings = get_settings()
logger = logging.getLogger("leadflow")
app = FastAPI(title="LeadFlow API", version="1.0.0", description="User-scoped CRM API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)


@app.middleware("http")
async def request_id(request: Request, call_next):
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exception: SQLAlchemyError):
    logger.error("Database error; request_id=%s", request.state.request_id, exc_info=exception)
    return JSONResponse(
        status_code=503,
        content={"detail": "Unable to save or load data right now. Please try again."},
    )


@app.get("/health", tags=["health"])
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "version": "1.0.0"}
