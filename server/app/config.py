from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = Field(
        default="postgresql://user:pass@localhost:5432/matchmaker",
        alias="DATABASE_URL",
    )
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    embedding_dim: int = Field(default=1536, alias="EMBEDDING_DIM")
    upload_dir: str = Field(default="uploads", alias="UPLOAD_DIR")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
