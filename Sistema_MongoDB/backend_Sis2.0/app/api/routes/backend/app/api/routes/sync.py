"""
Endpoint de sincronização completa do estado ST do HTML original.
Substitui o Google Apps Script — recebe e devolve o mesmo formato JSON.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from datetime import datetime
from typing import Any, Dict

router = APIRouter(prefix="/api/sync", tags=["sync"])

@router.get("/")
async def pull(current_user=Depends(get_current_user)):
    """Carrega o estado completo do banco (substitui pull do Sheets)."""
    db = get_db()
    doc = await db.app_state.find_one({"_id": "main"})
    if not doc:
        return {"contracts": [], "tasks": [], "vacations": [], "managers": [],
                "participants": [], "trips": [], "audits": [], "auditsGestao": [],
                "entregaveis": [], "medicoes": [], "finRows": [], "nextId": 100}
    doc.pop("_id", None)
    doc.pop("updated_at", None)
    doc.pop("updated_by", None)
    return doc

@router.post("/")
async def push(payload: Dict[str, Any], current_user=Depends(get_current_user)):
    """Salva o estado completo no banco (substitui push do Sheets)."""
    db = get_db()
    payload["updated_at"] = datetime.utcnow()
    payload["updated_by"] = current_user.get("id", "")
    await db.app_state.replace_one(
        {"_id": "main"},
        {"_id": "main", **payload},
        upsert=True
    )
    return {"ok": True, "saved_at": payload["updated_at"].isoformat()}

@router.get("/status")
async def status(current_user=Depends(get_current_user)):
    """Retorna quando foi a última sincronização."""
    db = get_db()
    doc = await db.app_state.find_one({"_id": "main"}, {"updated_at": 1, "updated_by": 1})
    if not doc:
        return {"last_sync": None, "updated_by": None}
    return {
        "last_sync": doc.get("updated_at"),
        "updated_by": doc.get("updated_by")
    }
