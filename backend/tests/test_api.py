"""Smoke tests: import graph, feature extraction and the health endpoint."""

import io
import wave

import numpy as np
from fastapi.testclient import TestClient

from app.features import TABULAR_FEATURES, extract
from app.main import app


def _tone_wav(seconds: float = 1.0, sr: int = 16000) -> bytes:
    t = np.linspace(0, seconds, int(sr * seconds), endpoint=False)
    y = 0.4 * np.sin(2 * np.pi * 220 * t) + 0.1 * np.sin(2 * np.pi * 440 * t)
    pcm = (y * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def test_feature_shape():
    feats = extract(_tone_wav())
    assert feats.tabular.shape == (len(TABULAR_FEATURES),)
    assert feats.mel.shape[0] == 128
    assert feats.duration_sec > 0


def test_health_endpoint():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_predict_requires_audio():
    client = TestClient(app)
    res = client.post("/predict", json={"file_name": "x.wav"})
    assert res.status_code in {401, 422}


def test_real_and_fake_detection():
    from app import storage, inference
    real_clips = storage.list_dataset("real")
    fake_clips = storage.list_dataset("fake")
    assert len(real_clips) > 0
    assert len(fake_clips) > 0

    res_real = inference.analyse(str(real_clips[0]), real_clips[0].name, explain=False)
    assert res_real.verdict == "authentic"
    assert res_real.probability < 0.42

    res_fake = inference.analyse(str(fake_clips[0]), fake_clips[0].name, explain=False)
    assert res_fake.verdict == "synthetic"
    assert res_fake.probability > 0.62
