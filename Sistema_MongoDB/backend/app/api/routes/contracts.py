from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_admin, require_any
from app.models.contract import ContractCreate, ContractUpdate
from app.models.user import Role
from app.services.financial import recalc_contract, consolidado_geral
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

def _filter_by_role(user: dict, query: dict) -> dict:
    """Filtra contratos baseado no role do usuário."""
    if user["role"] == Role.GESTOR:
        ids = user.get("contract_ids", [])
        query["_id"] = {"$in": [ObjectId(i) for i in ids if ObjectId.is_valid(i)]}
    return query

@router.get("/")
async def list_contracts(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    db = get_db()
    query = {}
    if status: query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"gestor_tecnico": {"$regex": search, "$options": "i"}},
        ]
    query = _filter_by_role(current_user, query)
    contracts = await db.contracts.find(query).to_list(200)
    medicoes  = await db.medicoes.find({}).to_list(5000)
    result = []
    for c in contracts:
        c["id"] = str(c["_id"])
        result.append(recalc_contract(c, medicoes))
    return result

@router.get("/consolidado")
async def consolidado(current_user=Depends(get_current_user)):
    db = get_db()
    query = _filter_by_role(current_user, {})
    contracts = await db.contracts.find(query).to_list(200)
    medicoes  = await db.medicoes.find({}).to_list(5000)
    calc = []
    for c in contracts:
        c["id"] = str(c["_id"])
        calc.append(recalc_contract(c, medicoes))
    return consolidado_geral(calc)

@router.get("/{contract_id}")
async def get_contract(contract_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    c = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not c: raise HTTPException(404, "Contrato não encontrado")
    # Role check
    if current_user["role"] == Role.GESTOR and contract_id not in current_user.get("contract_ids", []):
        raise HTTPException(403, "Sem acesso a este contrato")
    medicoes = await db.medicoes.find({"contract_id": contract_id}).to_list(500)
    c["id"] = str(c["_id"])
    return recalc_contract(c, medicoes)

@router.post("/", dependencies=[Depends(require_admin)])
async def create_contract(data: ContractCreate):
    db = get_db()
    doc = data.model_dump()
    doc["created_at"] = doc["updated_at"] = datetime.utcnow()
    result = await db.contracts.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Contrato criado"}

@router.put("/{contract_id}")
async def update_contract(
    contract_id: str,
    data: ContractUpdate,
    current_user=Depends(get_current_user)
):
    if current_user["role"] not in [Role.ADMIN, Role.GESTOR]:
        raise HTTPException(403, "Sem permissão")
    if current_user["role"] == Role.GESTOR and contract_id not in current_user.get("contract_ids", []):
        raise HTTPException(403, "Sem acesso a este contrato")
    db = get_db()
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.contracts.update_one({"_id": ObjectId(contract_id)}, {"$set": update})
    return {"message": "Contrato atualizado"}

@router.delete("/{contract_id}", dependencies=[Depends(require_admin)])
async def delete_contract(contract_id: str):
    db = get_db()
    await db.contracts.delete_one({"_id": ObjectId(contract_id)})
    await db.medicoes.delete_many({"contract_id": contract_id})
    return {"message": "Contrato removido"}
