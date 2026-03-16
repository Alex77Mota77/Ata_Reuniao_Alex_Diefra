from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId

# ── Helpers ──────────────────────────────────────────────────────────────────
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("ObjectId inválido")
        return str(v)

# ── Role ─────────────────────────────────────────────────────────────────────
UserRole = Literal["admin", "gestor", "financeiro", "visualizador"]

# ── User ─────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = "visualizador"
    active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        populate_by_name = True

class UserInDB(UserBase):
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

# ── Contract ─────────────────────────────────────────────────────────────────
class ContractBase(BaseModel):
    name: str
    code: str
    nObra: Optional[str] = None
    status: Literal["ativo","finalizado","paralizado","mob","desmobilizando","desmob"] = "ativo"
    start: Optional[str] = None
    end: Optional[str] = None
    gestorTecnico: Optional[str] = None
    telGestorTec: Optional[str] = None
    gestorAdministrativo: Optional[str] = None
    telGestorAdm: Optional[str] = None
    index: Optional[str] = None
    linkContrato: Optional[str] = None
    receita: float = 0
    custoTotal: float = 0
    saldoGlobal: float = 0
    justificativa: Optional[str] = None
    logo: Optional[str] = None
    logoFit: Optional[str] = "contain"
    logoPad: Optional[int] = 4

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    nObra: Optional[str] = None
    status: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    gestorTecnico: Optional[str] = None
    telGestorTec: Optional[str] = None
    gestorAdministrativo: Optional[str] = None
    telGestorAdm: Optional[str] = None
    index: Optional[str] = None
    linkContrato: Optional[str] = None
    receita: Optional[float] = None
    custoTotal: Optional[float] = None
    saldoGlobal: Optional[float] = None
    justificativa: Optional[str] = None
    logo: Optional[str] = None

class ContractOut(ContractBase):
    id: str = Field(alias="_id")
    # Campos calculados pelo motor de recálculo
    resultado: float = 0
    margem: float = 0
    saldo: float = 0
    ultimaMedicao: float = 0
    medicaoPrevista: float = 0
    totalFaturado: float = 0
    saldoAFaturar: float = 0
    execPct: float = 0
    countMeds: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        populate_by_name = True

# ── Medicao ───────────────────────────────────────────────────────────────────
class MedicaoBase(BaseModel):
    contractId: str
    key: str  # YYYY-MM
    previsto: Optional[float] = None
    realizado: Optional[float] = None
    obs: Optional[str] = None
    link: Optional[str] = None

class MedicaoCreate(MedicaoBase):
    pass

class MedicaoUpdate(BaseModel):
    previsto: Optional[float] = None
    realizado: Optional[float] = None
    obs: Optional[str] = None
    link: Optional[str] = None

class MedicaoOut(MedicaoBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        populate_by_name = True

# ── Task ─────────────────────────────────────────────────────────────────────
class TaskBase(BaseModel):
    contractId: str
    text: str
    done: bool = False
    responsavel: Optional[str] = None
    dataTarefa: Optional[str] = None
    dataPrevisao: Optional[str] = None
    dataResolucao: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    responsavel: Optional[str] = None
    dataTarefa: Optional[str] = None
    dataPrevisao: Optional[str] = None
    dataResolucao: Optional[str] = None

class TaskOut(TaskBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        populate_by_name = True

# ── Dashboard Summary ─────────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    totalContratos: int
    contratosAtivos: int
    receitaTotal: float
    custoTotal: float
    resultadoTotal: float
    margemMedia: float
    totalFaturado: float
    execucaoFaturamento: float
    contratosVencendo: int  # próximos 120 dias
    tarefasPendentes: int
