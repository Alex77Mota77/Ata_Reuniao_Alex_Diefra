"""
Motor de cálculo financeiro — Python puro.
Derivados de contratos a partir de medições.
"""
from typing import List, Dict, Any
from datetime import date

def recalc_contract(contract: Dict, medicoes: List[Dict]) -> Dict:
    """
    Calcula todos os campos derivados de um contrato
    baseado nas medições registradas.
    """
    receita    = contract.get("receita", 0) or 0
    custo      = contract.get("custo_total", 0) or 0
    hoje       = date.today()
    cur_key    = f"{hoje.year}-{str(hoje.month).zfill(2)}"

    contract_meds = [m for m in medicoes if m.get("contract_id") == str(contract.get("_id", contract.get("id", "")))]

    # 1. Campos base
    resultado = receita - custo
    margem    = round((resultado / receita * 100), 4) if receita > 0 else 0
    saldo     = resultado

    # 2. Última medição realizada
    realizados = sorted(
        [m for m in contract_meds if m.get("realizado") and m["realizado"] > 0],
        key=lambda m: m["key"], reverse=True
    )
    ultima_medicao     = realizados[0]["realizado"] if realizados else 0
    ultima_medicao_key = realizados[0]["key"] if realizados else None

    # 3. Medição prevista (mês atual ou mais recente)
    rec_atual = next((m for m in contract_meds if m["key"] == cur_key), None)
    if rec_atual and rec_atual.get("previsto"):
        medicao_prevista     = rec_atual["previsto"]
        medicao_prevista_key = cur_key
    else:
        previstos = sorted(
            [m for m in contract_meds if m.get("previsto") and m["previsto"] > 0],
            key=lambda m: m["key"], reverse=True
        )
        medicao_prevista     = previstos[0]["previsto"] if previstos else 0
        medicao_prevista_key = previstos[0]["key"] if previstos else None

    # 4. Acumulados
    total_faturado  = sum(m.get("realizado", 0) or 0 for m in contract_meds)
    saldo_a_faturar = receita - total_faturado
    exec_pct        = min(100.0, (total_faturado / receita * 100)) if receita > 0 else 0
    count_meds      = len([m for m in contract_meds if m.get("realizado") and m["realizado"] > 0])

    return {
        **{k: v for k, v in contract.items() if k != "_id"},
        "id": str(contract.get("_id", contract.get("id", ""))),
        "resultado":          round(resultado, 2),
        "margem":             margem,
        "saldo":              round(saldo, 2),
        "ultima_medicao":     ultima_medicao,
        "ultima_medicao_key": ultima_medicao_key,
        "medicao_prevista":   medicao_prevista,
        "medicao_prevista_key": medicao_prevista_key,
        "total_faturado":     round(total_faturado, 2),
        "saldo_a_faturar":    round(saldo_a_faturar, 2),
        "exec_pct":           round(exec_pct, 2),
        "count_meds":         count_meds,
    }

def recalc_all(contracts: List[Dict], medicoes: List[Dict]) -> List[Dict]:
    return [recalc_contract(c, medicoes) for c in contracts]

def consolidado_geral(contracts_calc: List[Dict]) -> Dict:
    """Agrega KPIs de todos os contratos."""
    tot_rec  = sum(c.get("receita", 0) for c in contracts_calc)
    tot_cus  = sum(c.get("custo_total", 0) for c in contracts_calc)
    tot_res  = sum(c.get("resultado", 0) for c in contracts_calc)
    tot_fat  = sum(c.get("total_faturado", 0) for c in contracts_calc)
    tot_salf = sum(c.get("saldo_a_faturar", 0) for c in contracts_calc)
    margem   = round(tot_res / tot_rec * 100, 2) if tot_rec > 0 else 0
    exec_pct = round(min(100.0, tot_fat / tot_rec * 100), 2) if tot_rec > 0 else 0
    ativos   = len([c for c in contracts_calc if c.get("status") == "ativo"])
    return {
        "total_contratos": len(contracts_calc),
        "ativos":          ativos,
        "receita_total":   round(tot_rec, 2),
        "custo_total":     round(tot_cus, 2),
        "resultado_total": round(tot_res, 2),
        "margem_media":    margem,
        "total_faturado":  round(tot_fat, 2),
        "saldo_a_faturar": round(tot_salf, 2),
        "exec_pct":        exec_pct,
    }
