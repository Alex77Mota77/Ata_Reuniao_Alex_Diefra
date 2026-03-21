"""
Motor de recálculo financeiro — mesmo comportamento do HTML,
mas rodando no backend Python com acesso ao MongoDB.
"""
from app.models.contract import Contract
from app.models.medicao  import Medicao
from datetime import datetime

async def recalc_contract(contract: Contract) -> Contract:
    """Recalcula todos os campos derivados de um contrato."""
    meds = await Medicao.find(Medicao.contract_id == str(contract.id)).to_list()

    receita = contract.receita or 0
    custo   = contract.custo_total or 0

    # 1. Resultado e margem
    contract.resultado = receita - custo
    contract.saldo     = receita - custo
    contract.margem    = round((contract.resultado / receita * 100), 4) if receita > 0 else 0

    # 2. Última medição (mais recente com realizado)
    realizados = sorted(
        [m for m in meds if m.realizado is not None and m.realizado > 0],
        key=lambda m: m.key, reverse=True
    )
    contract.ultima_medicao = realizados[0].realizado if realizados else 0

    # 3. Medição prevista (mês atual ou mais recente)
    cur_key = datetime.utcnow().strftime("%Y-%m")
    rec_atual = next((m for m in meds if m.key == cur_key), None)
    if rec_atual and rec_atual.previsto is not None:
        contract.medicao_prevista = rec_atual.previsto
    else:
        previstos = sorted(
            [m for m in meds if m.previsto is not None and m.previsto > 0],
            key=lambda m: m.key, reverse=True
        )
        contract.medicao_prevista = previstos[0].previsto if previstos else 0

    # 4. Acumulados de faturamento
    contract.total_faturado  = sum(m.realizado or 0 for m in meds)
    contract.saldo_a_faturar = receita - contract.total_faturado
    contract.exec_pct        = min(100, contract.total_faturado / receita * 100) if receita > 0 else 0

    contract.updated_at = datetime.utcnow()
    await contract.save()
    return contract

async def get_consolidated() -> dict:
    """KPIs consolidados de todos os contratos."""
    contracts = await Contract.find_all().to_list()
    tot_rec  = sum(c.receita or 0 for c in contracts)
    tot_cus  = sum(c.custo_total or 0 for c in contracts)
    tot_res  = sum(c.resultado or 0 for c in contracts)
    tot_fat  = sum(c.total_faturado or 0 for c in contracts)
    tot_sal  = sum(c.saldo_a_faturar or 0 for c in contracts)
    exec_pct = min(100, tot_fat / tot_rec * 100) if tot_rec > 0 else 0
    margem   = round(tot_res / tot_rec * 100, 2) if tot_rec > 0 else 0

    return {
        "total_receita":      tot_rec,
        "total_custo":        tot_cus,
        "total_resultado":    tot_res,
        "total_faturado":     tot_fat,
        "saldo_a_faturar":    tot_sal,
        "exec_pct":           round(exec_pct, 1),
        "margem_media":       margem,
        "total_contratos":    len(contracts),
        "ativos":             sum(1 for c in contracts if c.status == "ativo"),
    }
