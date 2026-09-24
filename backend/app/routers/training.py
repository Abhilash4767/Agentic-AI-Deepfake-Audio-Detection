from fastapi import APIRouter, Depends, HTTPException

from .. import storage, training
from ..schemas import TrainingAccepted, TrainingJobStatus, TrainingRequest
from ..security import require_api_key

router = APIRouter(tags=["training"], dependencies=[Depends(require_api_key)])


@router.post("/train", response_model=TrainingAccepted, status_code=202)
async def start_training(payload: TrainingRequest) -> TrainingAccepted:
    """Called by the dashboard's `training_url` setting.

    Any `samples` with signed URLs are downloaded into the local dataset folder
    first, so cloud-labelled clips and locally dropped files train together.
    """
    fetched = 0
    for sample in payload.samples:
        if not sample.audio_url:
            continue
        try:
            content = await storage.fetch_audio(str(sample.audio_url))
            storage.save_dataset_file(sample.label, sample.file_name, content)
            fetched += 1
        except Exception:
            continue

    job = training.start(
        name=payload.name,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        learning_rate=payload.learning_rate,
        val_split=payload.val_split,
    )
    return TrainingAccepted(
        job_id=job["job_id"],
        status=job["status"],
        message=f"Training queued on {job['dataset_size']} clips ({fetched} synced from cloud).",
    )


@router.get("/status/{job_id}", response_model=TrainingJobStatus)
async def job_status(job_id: str) -> TrainingJobStatus:
    job = training.get_job(job_id)
    if not job:
        raise HTTPException(404, "Unknown job id")
    return TrainingJobStatus(**job)


@router.get("/jobs", response_model=list[TrainingJobStatus])
async def jobs() -> list[TrainingJobStatus]:
    return [TrainingJobStatus(**j) for j in training.list_jobs()]
