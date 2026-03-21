from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ContractStatus(str, Enum):
    ATIVO          = "ativo"
    FINALIZADO     = "finalizado"
    PARALIZADO     = "paralizado"
    MOB            = "mob"
    DESMOBILIZANDO = "desmobilizando"
    DESMOB         = "desmob"

class ContractBase(BaseModel):
    name: str
    code: str
    n_obra: Optional[str] = None
    status: ContractStatus = ContractStatus.ATIVO
    start: Optional[str] = None
    end: Optional[str] = None
    gestor_tecnico: Optional[str] = None
    tel_gestor_tec: Optional[str] = None
    gestor_administrativo: Optional[str] = None
    tel_gestor_adm: Optional[str] = None
    index: Optional[str] = None
    link_contrato: Optional[str] = None
    # Financeiro
    receita: float = 0
    custo_total: float = 0
    saldo_global: float = 0
    justificativa: Optional[str] = None
    # Logo
    logo: Optional[str] = None
    logo_fit: str = "contain"
    logo_pad: int = 4

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    n_obra: Optional[str] = None
    status: Optional[ContractStatus] = None
    start: Optional[str] = None
    end: Optional[str] = None
    gestor_tecnico: Optional[str] = None
    tel_gestor_tec: Optional[str] = None
    gestor_administrativo: Optional[str] = None
    tel_gestor_adm: Optional[str] = None
    index: Optional[str] = None
    link_contrato: Optional[str] = None
    receita: Optional[float] = None
    custo_total: Optional[float] = None
    saldo_global: Optional[float] = None
    justificativa: Optional[str] = None
    logo: Optional[str] = None
    logo_fit: Optional[str] = None
    logo_pad: Optional[int] = None

class ContractResponse(ContractBase):
    id: str
    # Campos calculados (derivados das medições)
    resultado: float = 0
    margem: float = 0
    saldo: float = 0
    ultima_medicao: float = 0
    medicao_prevista: float = 0
    total_faturado: float = 0
    saldo_a_faturar: float = 0
    exec_pct: float = 0
    count_meds: int = 0
    created_at: datetime
    updated_at: datetime
