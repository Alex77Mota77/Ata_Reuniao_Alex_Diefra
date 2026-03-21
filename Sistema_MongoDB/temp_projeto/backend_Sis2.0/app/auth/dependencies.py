from fastapi import Depends, HTTPException, status
from app.auth.jwt import oauth2_scheme, decode_token
from app.core.database import get_db
from app.models.user import Role
from bson import ObjectId

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Usuário inativo ou não encontrado")
    user["id"] = str(user["_id"])
    return user

def require_roles(*roles: Role):
    async def checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Requer: {', '.join(roles)}"
            )
        return current_user
    return checker

require_admin      = require_roles(Role.ADMIN)
require_financeiro = require_roles(Role.ADMIN, Role.FINANCEIRO)
require_gestor     = require_roles(Role.ADMIN, Role.GESTOR)
require_any        = require_roles(Role.ADMIN, Role.GESTOR, Role.FINANCEIRO, Role.VIEWER)
