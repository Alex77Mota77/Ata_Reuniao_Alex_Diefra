from fastapi import APIRouter, Depends
from app.models.user import User
from app.auth.jwt import get_current_user, require_financeiro
from app.services.financeiro import get_consolidated
from app.models.contract import Contract
from app.models.medicao import Medicao
from typing import Optional

router = APIRouter(prefix="/api/financeiro", tags=["financeiro"])

@router.get("/consolidado")
async def consolidado(_: User = Depends(require_financeiro)):
    return await get_consolidated()

@router.get("/periodo")
async def medicoes_periodo(
    contract_id: str,
    key: str,                           # YYYY-MM
    _: User = Depends(get_current_user)
):
    """Retorna previsto e realizado de um contrato num mês específico."""
    med = await Medicao.find_one(
        Medicao.contract_id == contract_id,
        Medicao.key         == key
    )
    ct  = await Contract.get(contract_id)
    return {
        "previsto":      med.previsto  if med else None,
        "realizado":     med.realizado if med else None,
        "obs":           med.obs       if med else None,
        "link":          med.link      if med else None,
        "justificativa": ct.justificativa if ct else None,
    }

@router.get("/meses-com-dados")
async def meses_com_dados(
    contract_id: Optional[str] = None,
    _: User = Depends(get_current_user)
):
    """Lista os meses (YYYY-MM) que têm alguma medição registrada."""
    query = {}
    if contract_id:
        query["contract_id"] = contract_id
    meds = await Medicao.find(query).to_list()
    keys = sorted(set(m.key for m in meds))
    return {"keys": keys}
