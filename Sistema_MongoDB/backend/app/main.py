import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_db, close_db
from app.core.config import settings
from app.api.routes import auth, contracts, medicoes, users, sync

# Logging configurado para nivel debug (compatível com LOG_LEVEL=debug do seu .env)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando DIEFRA API...")
    await connect_db()
    logger.info(f"🔗 MongoDB: {settings.DATABASE_NAME}")
    yield
    await close_db()
    logger.info("👋 DIEFRA API encerrada")

app = FastAPI(
    title="DIEFRA API",
    description="Sistema de Gestão de Contratos DIEFRA — Multi-Usuário",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
)

# CORS — usa lista do .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth.router)
app.include_router(contracts.router)
app.include_router(medicoes.router)
app.include_router(users.router)
app.include_router(sync.router)

@app.get("/health", tags=["system"])
async def health():
    return {
        "status":   "ok",
        "version":  "2.0.0",
        "database": settings.DATABASE_NAME,
        "env":      "development",
    }

@app.get("/", tags=["system"])
async def root():
    return {"message": "DIEFRA API 2.0 — acesse /docs para a documentação"}
