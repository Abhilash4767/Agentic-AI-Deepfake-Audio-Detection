"""Request / response contracts. These mirror what the dashboard expects."""

from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl


# ---------- inference ----------


class InferenceRequest(BaseModel):
    """Either audio_url (signed URL from cloud storage) or base64 audio."""

    audio_url: HttpUrl | None = None
    audio_base64: str | None = None
    file_name: str = "sample.wav"
    explain: bool = True


class Attribution(BaseModel):
    feature: str
    value: float
    weight: float
    direction: Literal["synthetic", "human"]


class Explanation(BaseModel):
    shap: list[Attribution] = Field(default_factory=list)
    lime: list[Attribution] = Field(default_factory=list)
    feature_importance: list[Attribution] = Field(default_factory=list)
    spectrogram_heatmap: list[list[float]] = Field(default_factory=list)
    saliency: list[float] = Field(default_factory=list)
    narrative: str = ""


class InferenceResponse(BaseModel):
    probability: float = Field(ge=0.0, le=1.0, description="P(synthetic)")
    verdict: Literal["authentic", "review", "synthetic"]
    model: str
    source: Literal["cnn", "heuristic"] = "cnn"
    duration_sec: float
    sample_rate: int
    file_name: str
    features: dict[str, float] = Field(default_factory=dict)
    explanation: Explanation | None = None


# ---------- dataset ----------


class DatasetStats(BaseModel):
    real: int
    fake: int
    total: int
    total_seconds: float
    balance: float


class DatasetItem(BaseModel):
    file_name: str
    label: Literal["real", "fake"]
    size_kb: float
    duration_sec: float | None = None


# ---------- training ----------


class TrainingSampleRef(BaseModel):
    label: Literal["real", "fake"]
    file_name: str
    audio_url: HttpUrl | None = None


class TrainingRequest(BaseModel):
    name: str = "training-run"
    epochs: int = Field(default=25, ge=1, le=500)
    batch_size: int | None = None
    learning_rate: float | None = None
    val_split: float | None = Field(default=None, ge=0.05, le=0.5)
    use_local_dataset: bool = True
    samples: list[TrainingSampleRef] = Field(default_factory=list)


class TrainingJobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    name: str
    epochs: int
    dataset_size: int
    accuracy: float | None = None
    val_accuracy: float | None = None
    loss: float | None = None
    message: str | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)
    started_at: str | None = None
    completed_at: str | None = None


class TrainingAccepted(BaseModel):
    job_id: str
    status: str
    message: str
