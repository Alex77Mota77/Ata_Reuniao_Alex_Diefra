from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None

async def connect_db():
    """Conecta ao MongoDB Atlas usando a URI configurada no .env"""
    global client
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=10000,  # 10s timeout
            connectTimeoutMS=10000,
        )
        # Testa a conexão
        await client.admin.command('ping')
        logger.info(f"✅ MongoDB Atlas conectado — banco: {settings.DATABASE_NAME}")
        # Cria índices necessários
        await _create_indexes()
    except Exception as e:
        logger.error(f"❌ Falha ao conectar MongoDB: {e}")
        raise

async def _create_indexes():
    """Cria índices para performance."""
    db = get_db()
    # Users
    await db.users.create_index("email", unique=True)
    # Contracts
    await db.contracts.create_index("code")
    await db.contracts.create_index("status")
    # Medicoes — índice composto para upsert eficiente
    await db.medicoes.create_index([("contract_id", 1), ("key", 1)], unique=True)
    logger.info("✅ Índices MongoDB criados")

async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB desconectado")

def get_db() -> AsyncIOMotorDatabase:
    return client[settings.DATABASE_NAME]
