from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.auth.jwt import hash_password
from app.models.user import UserCreate, UserUpdate, UserResponse
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/", dependencies=[Depends(require_admin)])
async def list_users():
    db = get_db()
    users = await db.users.find({}, {"hashed_password": 0}).to_list(200)
    for u in users:
        u["id"] = str(u["_id"]); del u["_id"]
    return users

@router.post("/", dependencies=[Depends(require_admin)])
async def create_user(data: UserCreate):
    db = get_db()
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email já cadastrado")
    doc = {
        "name": data.name, "email": data.email,
        "hashed_password": hash_password(data.password),
        "role": data.role, "contract_ids": data.contract_ids,
        "is_active": data.is_active,
        "created_at": datetime.utcnow(), "last_login": None,
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Usuário criado"}

@router.put("/{user_id}", dependencies=[Depends(require_admin)])
async def update_user(user_id: str, data: UserUpdate):
    db = get_db()
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "password" in update:
        update["hashed_password"] = hash_password(update.pop("password"))
    if update:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    return {"message": "Usuário atualizado"}

@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    if str(current_user["id"]) == user_id:
        raise HTTPException(400, "Você não pode excluir a si mesmo")
    db = get_db()
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "Usuário removido"}
