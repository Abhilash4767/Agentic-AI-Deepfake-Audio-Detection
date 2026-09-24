"""Real DSP feature extraction: log-mel spectrogram, MFCC + deltas, prosody.

The CNN consumes the log-mel image; the tabular vector feeds SHAP/LIME and the
human-readable attribution list in the dashboard.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import librosa
import numpy as np

from .config import settings

TABULAR_FEATURES: list[str] = [
    "mfcc_mean",
    "mfcc_std",
    "delta_energy",
    "spectral_centroid",
    "spectral_bandwidth",
    "spectral_rolloff",
    "spectral_flatness",
    "zero_crossing_rate",
    "rms_energy",
    "f0_mean",
    "f0_std",
    "jitter",
    "shimmer",
    "harmonic_ratio",
    "tone_consistency",
    "voice_stress",
    "silence_ratio",
    "high_band_energy",
]

FEATURE_LABELS: dict[str, str] = {
    "mfcc_mean": "MFCC mean envelope",
    "mfcc_std": "MFCC dispersion",
    "delta_energy": "Delta-MFCC energy",
    "spectral_centroid": "Spectral centroid",
    "spectral_bandwidth": "Spectral bandwidth",
    "spectral_rolloff": "Spectral roll-off",
    "spectral_flatness": "Spectral flatness",
    "zero_crossing_rate": "Zero-crossing rate",
    "rms_energy": "RMS energy",
    "f0_mean": "Pitch (F0) mean",
    "f0_std": "Pitch (F0) variability",
    "jitter": "Jitter",
    "shimmer": "Shimmer",
    "harmonic_ratio": "Harmonic-to-noise ratio",
    "tone_consistency": "Tone consistency",
    "voice_stress": "Voice stress",
    "silence_ratio": "Silence ratio",
    "high_band_energy": "High-band (>6 kHz) energy",
}


@dataclass
class AudioFeatures:
    mel: np.ndarray  # (n_mels, frames) log-mel spectrogram
    mfcc: np.ndarray  # (n_mfcc * 3, frames) mfcc + delta + delta2
    tabular: np.ndarray  # (len(TABULAR_FEATURES),)
    duration_sec: float
    sample_rate: int

    def as_dict(self) -> dict[str, float]:
        return {k: float(v) for k, v in zip(TABULAR_FEATURES, self.tabular, strict=True)}


def load_audio(source: str | bytes) -> tuple[np.ndarray, int]:
    """Load from a path or raw bytes, mono, resampled, trimmed to MAX_SECONDS."""
    sr = settings.sample_rate
    if isinstance(source, bytes):
        y, _ = librosa.load(io.BytesIO(source), sr=sr, mono=True)
    else:
        y, _ = librosa.load(source, sr=sr, mono=True)
    y, _ = librosa.effects.trim(y, top_db=35)
    limit = int(settings.max_seconds * sr)
    if len(y) > limit:
        y = y[:limit]
    if len(y) < sr // 2:  # pad very short clips to 0.5s
        y = np.pad(y, (0, max(0, sr // 2 - len(y))))
    peak = float(np.max(np.abs(y))) or 1.0
    return (y / peak).astype(np.float32), sr


def _safe(x: float) -> float:
    return float(x) if np.isfinite(x) else 0.0


def _jitter_shimmer(y: np.ndarray, sr: int) -> tuple[float, float]:
    frames = librosa.util.frame(y, frame_length=1024, hop_length=256)
    if frames.size == 0:
        return 0.0, 0.0
    amps = np.sqrt((frames**2).mean(axis=0)) + 1e-9
    shimmer = _safe(np.mean(np.abs(np.diff(amps))) / np.mean(amps))
    zc = np.mean(np.abs(np.diff(np.sign(frames), axis=0)), axis=0) + 1e-9
    jitter = _safe(np.std(zc) / np.mean(zc))
    return jitter, shimmer


def extract(source: str | bytes) -> AudioFeatures:
    y, sr = load_audio(source)

    mel = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=settings.n_mels, n_fft=1024, hop_length=256
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)

    mfcc = librosa.feature.mfcc(S=log_mel, n_mfcc=settings.n_mfcc)
    d1 = librosa.feature.delta(mfcc)
    d2 = librosa.feature.delta(mfcc, order=2)
    mfcc_stack = np.vstack([mfcc, d1, d2])

    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    flatness = librosa.feature.spectral_flatness(y=y)
    zcr = librosa.feature.zero_crossing_rate(y)
    rms = librosa.feature.rms(y=y)

    try:
        f0 = librosa.yin(y, fmin=60, fmax=400, sr=sr)
        f0 = f0[np.isfinite(f0)]
    except Exception:  # pragma: no cover - yin can fail on pathological input
        f0 = np.array([0.0])
    if f0.size == 0:
        f0 = np.array([0.0])

    harmonic = librosa.effects.harmonic(y)
    hnr = _safe(np.sum(harmonic**2) / (np.sum((y - harmonic) ** 2) + 1e-9))

    jitter, shimmer = _jitter_shimmer(y, sr)

    frame_db = librosa.amplitude_to_db(rms[0] + 1e-9)
    silence_ratio = _safe(np.mean(frame_db < (frame_db.max() - 35)))

    freqs = librosa.mel_frequencies(n_mels=settings.n_mels, fmin=0, fmax=sr / 2)
    high_mask = freqs > 6000
    high_band = _safe(np.mean(mel[high_mask]) / (np.mean(mel) + 1e-9)) if high_mask.any() else 0.0

    # Synthetic speech tends to be *too* stable: low centroid variance, low stress.
    tone_consistency = _safe(1.0 - np.std(centroid) / (np.mean(centroid) + 1e-9))
    voice_stress = _safe(np.std(np.diff(rms[0])) * 50.0)

    tabular = np.array(
        [
            _safe(np.mean(mfcc)),
            _safe(np.std(mfcc)),
            _safe(np.mean(np.abs(d1))),
            _safe(np.mean(centroid) / 4000.0),
            _safe(np.mean(bandwidth) / 4000.0),
            _safe(np.mean(rolloff) / 8000.0),
            _safe(np.mean(flatness)),
            _safe(np.mean(zcr)),
            _safe(np.mean(rms)),
            _safe(np.mean(f0) / 300.0),
            _safe(np.std(f0) / 100.0),
            jitter,
            shimmer,
            hnr,
            tone_consistency,
            voice_stress,
            silence_ratio,
            high_band,
        ],
        dtype=np.float32,
    )

    return AudioFeatures(
        mel=log_mel.astype(np.float32),
        mfcc=mfcc_stack.astype(np.float32),
        tabular=tabular,
        duration_sec=float(len(y) / sr),
        sample_rate=sr,
    )


def fixed_mel(mel: np.ndarray, frames: int = 256) -> np.ndarray:
    """Pad/crop the spectrogram to a fixed width so it batches cleanly."""
    if mel.shape[1] >= frames:
        return mel[:, :frames]
    return np.pad(mel, ((0, 0), (0, frames - mel.shape[1])), mode="edge")
