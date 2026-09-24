from fastapi import APIRouter

from ..config import settings
from ..model import checkpoint_path, load
from ..storage import list_dataset

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    loaded = load()
    return {
        "status": "ok",
        "model_trained": loaded is not None,
        "model_meta": (loaded[1] if loaded else {}),
        "checkpoint": str(checkpoint_path()),
        "dataset": {"real": len(list_dataset("real")), "fake": len(list_dataset("fake"))},
        "sample_rate": settings.sample_rate,
        "auth_required": bool(settings.model_api_key),
    }
