from beanie import Document
from typing import Optional
from datetime import datetime

class Task(Document):
    contract_id:      str
    text:             str
    done:             bool = False
    responsavel:      Optional[str] = None
    data_tarefa:      Optional[str] = None
    data_previsao:    Optional[str] = None
    data_resolucao:   Optional[str] = None
    created_at:       datetime = datetime.utcnow()
    updated_at:       datetime = datetime.utcnow()

    class Settings:
        name = "tasks"
