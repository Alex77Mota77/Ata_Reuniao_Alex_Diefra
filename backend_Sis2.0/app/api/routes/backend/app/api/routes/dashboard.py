from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.auth.jwt import get_current_user
from app.models.schemas import DashboardSummary
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
async def get_summary(current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Filtro por role
    query = {}
    if current_user["role"] == "gestor":
        query["$or"] = [
            {"gestorTecnico": current_user["name"]},
            {"gestorAdministrativo": current_user["name"]}
        ]

    contracts = await db.contracts.find(query).to_list(None)
    tasks     = await db.tasks.find({"done": False}).to_list(None)

    hoje      = datetime.utcnow()
    prazo_lim = (hoje + timedelta(days=120)).strftime("%Y-%m-%d")

    ativos     = [c for c in contracts if c.get("status") == "ativo"]
    vencendo   = [c for c in contracts if c.get("end","") <= prazo_lim and c.get("end","") >= hoje.strftime("%Y-%m-%d")]
    rec_total  = sum(c.get("receita",0) or 0 for c in contracts)
    cus_total  = sum(c.get("custoTotal",0) or 0 for c in contracts)
    res_total  = sum(c.get("resultado",0) or 0 for c in contracts)
    fat_total  = sum(c.get("totalFaturado",0) or 0 for c in contracts)
    margem_avg = round(res_total / rec_total * 100, 2) if rec_total > 0 else 0
    exec_pct   = round(fat_total / rec_total * 100, 2) if rec_total > 0 else 0

    return {
        "totalContratos":       len(contracts),
        "contratosAtivos":      len(ativos),
        "receitaTotal":         rec_total,
        "custoTotal":           cus_total,
        "resultadoTotal":       res_total,
        "margemMedia":          margem_avg,
        "totalFaturado":        fat_total,
        "execucaoFaturamento":  exec_pct,
        "contratosVencendo":    len(vencendo),
        "tarefasPendentes":     len(tasks),
    }


@router.get("/financeiro/consolidado")
async def financeiro_consolidado(current_user: dict = Depends(get_current_user)):
    """KPIs acumulados de todos os contratos para a Linha 1 do Painel Financeiro."""
    db = get_db()
    contracts = await db.contracts.find({}).to_list(None)

    rec_total  = sum(c.get("receita",0) or 0 for c in contracts)
    cus_total  = sum(c.get("custoTotal",0) or 0 for c in contracts)
    res_total  = sum(c.get("resultado",0) or 0 for c in contracts)
    fat_total  = sum(c.get("totalFaturado",0) or 0 for c in contracts)
    sal_total  = sum(c.get("saldoAFaturar",0) or 0 for c in contracts)
    margem     = round(res_total / rec_total * 100, 2) if rec_total > 0 else 0
    exec_pct   = round(fat_total / rec_total * 100, 2) if rec_total > 0 else 0

    return {
        "receitaTotal":        rec_total,
        "custoTotal":          cus_total,
        "resultadoTotal":      res_total,
        "margemMedia":         margem,
        "totalFaturado":       fat_total,
        "saldoAFaturar":       sal_total,
        "execucaoFaturamento": exec_pct,
        "totalContratos":      len(contracts),
        "contratosAtivos":     sum(1 for c in contracts if c.get("status")=="ativo"),
    }
