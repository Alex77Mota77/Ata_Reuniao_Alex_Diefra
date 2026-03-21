"""
Roda este script para testar a conexão com o MongoDB antes de subir o servidor:
  python test_connection.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def test():
    url  = os.getenv("MONGODB_URL")
    name = os.getenv("DATABASE_NAME", "bd_diefra_ata_reuniao")
    
    print(f"🔗 Conectando ao banco: {name}")
    try:
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=8000)
        await client.admin.command('ping')
        db = client[name]
        
        # Lista coleções existentes
        cols = await db.list_collection_names()
        print(f"✅ Conexão OK!")
        print(f"📂 Banco: {name}")
        print(f"📋 Coleções: {cols if cols else '(vazio — banco novo)'}")
        
        # Conta documentos
        for col in cols:
            count = await db[col].count_documents({})
            print(f"   {col}: {count} documentos")
        
        client.close()
    except Exception as e:
        print(f"❌ Erro: {e}")

asyncio.run(test())
