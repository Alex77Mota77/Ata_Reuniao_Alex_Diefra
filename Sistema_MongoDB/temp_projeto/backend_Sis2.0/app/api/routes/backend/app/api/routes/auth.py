from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_db
from app.auth.jwt import verify_password, create_access_token, hash_password
from app.auth.dependencies import get_current_user
from app.models.user import UserCreate, UserResponse, Role
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Conta desativada")
    # Atualiza last_login
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})
    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "contract_ids": user.get("contract_ids", []),
        }
    }

@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id":           current_user["id"],
        "name":         current_user["name"],
        "email":        current_user["email"],
        "role":         current_user["role"],
        "contract_ids": current_user.get("contract_ids", []),
    }

@router.post("/setup-admin")
async def setup_first_admin(user_data: UserCreate):
    """Cria o primeiro admin. Só funciona se não houver nenhum usuário."""
    db = get_db()
    count = await db.users.count_documents({})
    if count > 0:
        raise HTTPException(status_code=403, detail="Setup já realizado")
    doc = {
        "name": user_data.name,
        "email": user_data.email,
        "hashed_password": hash_password(user_data.password),
        "role": Role.ADMIN,
        "contract_ids": [],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
    }
    result = await db.users.insert_one(doc)
    return {"message": "Admin criado com sucesso", "id": str(result.inserted_id)}
