import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def main():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client['bd_diefra_ata_reuniao']
    await db.users.delete_many({'email': 'alex77mota77@gmail.com'})
    await db.users.insert_one({
        'name': 'Alex Mota',
        'email': 'alex77mota77@gmail.com',
        'hashed_password': pwd.hash('Diefra2026'),
        'role': 'admin',
        'contract_ids': [],
        'is_active': True,
        'created_at': datetime.utcnow(),
        'last_login': None,
    })
    print('Admin criado!')
    client.close()

asyncio.run(main())
