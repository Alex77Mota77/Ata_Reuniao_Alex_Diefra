from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.medicao import MedicaoCreate, MedicaoUpdate
from app.models.user import Role
from datetime import datetime
from bson import ObjectId
from typing import Optional

router = APIRouter(prefix="/api/medicoes", tags=["medicoes"])

@router.get("/")
async def list_medicoes(
    contract_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    db = get_db()
    query = {}
    if contract_id: query["contract_id"] = contract_id
    if current_user["role"] == Role.GESTOR:
        query["contract_id"] = {"$in": current_user.get("contract_ids", [])}
    docs = await db.medicoes.find(query).sort("key", -1).to_list(2000)
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
    return docs

@router.post("/")
async def upsert_medicao(data: MedicaoCreate, current_user=Depends(get_current_user)):
    """Cria ou atualiza medição (upsert por contract_id + key)."""
    if current_user["role"] in [Role.VIEWER, Role.FINANCEIRO]:
        raise HTTPException(403, "Sem permissão para registrar medições")
    db = get_db()
    now = datetime.utcnow()
    doc = data.model_dump()
    doc["updated_at"]  = now
    doc["created_by"]  = current_user["id"]
    # Se obs preenchida, atualiza justificativa do contrato
    if data.obs:
        await db.contracts.update_one(
            {"_id": ObjectId(data.contract_id)},
            {"$set": {"justificativa": data.obs, "updated_at": now}}
        )
    existing = await db.medicoes.find_one({"contract_id": data.contract_id, "key": data.key})
    if existing:
        await db.medicoes.update_one({"_id": existing["_id"]}, {"$set": doc})
        return {"id": str(existing["_id"]), "message": "Medição atualizada"}
    else:
        doc["created_at"] = now
        result = await db.medicoes.insert_one(doc)
        return {"id": str(result.inserted_id), "message": "Medição criada"}

@router.delete("/{medicao_id}")
async def delete_medicao(medicao_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] not in [Role.ADMIN, Role.GESTOR]:
        raise HTTPException(403, "Sem permissão")
    db = get_db()
    await db.medicoes.delete_one({"_id": ObjectId(medicao_id)})
    return {"message": "Medição removida"}
