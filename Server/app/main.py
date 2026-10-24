import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from .core import db
from .core.config import get_settings
from .routers import auth, interview

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("prepmate")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="PrepMate AI API", version="2.0.0", lifespan=lifespan,
                  docs_url=None if s.is_prod else "/docs", redoc_url=None)

    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(interview.router)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    # Keep the response shape the React client already reads: { message } / { error }
    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"] if p not in ("body", "form"))
        msg = f"{field}: {first['msg']}" if field else first["msg"]
        return JSONResponse(status_code=422, content={"message": msg, "error": msg})

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("unhandled error")
        return JSONResponse(status_code=500, content={"message": "Internal Server Error",
                                                      "error": "Internal Server Error"})

    from fastapi import HTTPException

    @app.exception_handler(HTTPException)
    async def http_handler(_: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code,
                            content={"message": exc.detail, "error": exc.detail})

    return app


app = create_app()
