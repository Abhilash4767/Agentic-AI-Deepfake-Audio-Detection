from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from .. import storage
from ..inference import analyse
from ..schemas import InferenceRequest, InferenceResponse
from ..security import require_api_key

router = APIRouter(tags=["inference"], dependencies=[Depends(require_api_key)])


@router.post("/predict", response_model=InferenceResponse)
async def predict(payload: InferenceRequest) -> InferenceResponse:
    """JSON entry point used by the dashboard's `inference_url` setting."""
    if payload.audio_url:
        content = await storage.fetch_audio(str(payload.audio_url))
    elif payload.audio_base64:
        content = storage.decode_base64(payload.audio_base64)
    else:
        raise HTTPException(422, "Provide audio_url or audio_base64")

    try:
        return analyse(content, payload.file_name, payload.explain)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Analysis failed: {exc}") from exc


@router.post("/predict/upload", response_model=InferenceResponse)
async def predict_upload(
    file: UploadFile = File(...), explain: bool = Form(default=True)
) -> InferenceResponse:
    """Multipart entry point for direct browser / curl uploads."""
    content = await file.read()
    if not content:
        raise HTTPException(422, "Empty file")
    try:
        return analyse(content, file.filename or "upload.wav", explain)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Analysis failed: {exc}") from exc
