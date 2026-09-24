"""Central configuration, loaded from environment / .env."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # security
    model_api_key: str = ""

    # server
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: str = "http://localhost:8080"

    # paths
    data_dir: str = "data"
    dataset_dir: str = "data/dataset"
    upload_dir: str = "data/uploads"
    model_dir: str = "models"

    # audio
    sample_rate: int = 16000
    n_mfcc: int = 40
    n_mels: int = 128
    max_seconds: float = 15.0

    # training
    default_epochs: int = 25
    batch_size: int = 32
    learning_rate: float = 1e-3
    val_split: float = 0.2

    # optional embeddings
    enable_wav2vec2: bool = False
    wav2vec2_model: str = "facebook/wav2vec2-base"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def path(self, value: str) -> Path:
        p = Path(value)
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def dataset_path(self) -> Path:
        return self.path(self.dataset_dir)

    @property
    def upload_path(self) -> Path:
        return self.path(self.upload_dir)

    @property
    def model_path(self) -> Path:
        return self.path(self.model_dir)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    for p in (s.dataset_path / "real", s.dataset_path / "fake", s.upload_path, s.model_path):
        p.mkdir(parents=True, exist_ok=True)
    return s


settings = get_settings()
