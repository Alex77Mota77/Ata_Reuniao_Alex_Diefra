from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import connect_db, close_db
from app.services.financial import recalc_all_contracts
from app.api.routes import auth, contracts, medicoes, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    await recalc_all_contracts()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="DIEFRA API",
    description="Sistema de Gestão de Contratos e Financeiro",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth.router,      prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(medicoes.router,  prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "system": "DIEFRA"}
