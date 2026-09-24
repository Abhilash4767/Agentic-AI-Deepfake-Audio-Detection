"""Local dataset + upload handling and (optional) remote audio fetching."""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path

import httpx

from .config import settings

AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".webm"}


def safe_name(name: str) -> str:
    cleaned = re.sub(r"[^\w.\-]+", "_", name).strip("._") or "clip"
    return cleaned[:120]


def dataset_dir(label: str) -> Path:
    if label not in {"real", "fake"}:
        raise ValueError("label must be 'real' or 'fake'")
    path = settings.dataset_path / label
    path.mkdir(parents=True, exist_ok=True)
    return path


def list_dataset(label: str) -> list[Path]:
    return sorted(p for p in dataset_dir(label).iterdir() if p.suffix.lower() in AUDIO_SUFFIXES)


def save_dataset_file(label: str, file_name: str, content: bytes) -> Path:
    target = dataset_dir(label) / f"{uuid.uuid4().hex[:8]}-{safe_name(file_name)}"
    target.write_bytes(content)
    return target


def save_upload(file_name: str, content: bytes) -> Path:
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    target = settings.upload_path / f"{uuid.uuid4().hex[:8]}-{safe_name(file_name)}"
    target.write_bytes(content)
    return target


async def fetch_audio(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.content


def decode_base64(payload: str) -> bytes:
    if "," in payload[:64] and payload.strip().startswith("data:"):
        payload = payload.split(",", 1)[1]
    return base64.b64decode(payload)
