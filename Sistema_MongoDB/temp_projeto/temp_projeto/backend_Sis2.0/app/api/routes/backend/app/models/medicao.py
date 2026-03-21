from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MedicaoBase(BaseModel):
    contract_id: str
    key: str          # formato YYYY-MM
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

class MedicaoResponse(MedicaoBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: str   # user_id de quem criou
