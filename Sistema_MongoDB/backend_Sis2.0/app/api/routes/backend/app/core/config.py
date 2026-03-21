from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL:    str
    DATABASE_NAME:  str = "bd_diefra_ata_reuniao"

    # JWT — mesmos nomes do seu .env original
    SECRET_KEY:     str
    ALGORITHM:      str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias

    # CORS
    CORS_ORIGINS: str = '["http://localhost:4200"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        extra    = "ignore"   # ignora NODE_ENV, PORT etc que não estão no modelo

settings = Settings()
