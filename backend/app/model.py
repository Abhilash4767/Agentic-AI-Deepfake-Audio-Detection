"""CNN over log-mel spectrograms, fused with a tabular prosody branch."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from .config import settings
from .features import TABULAR_FEATURES

CHECKPOINT = "deepfake_cnn.pt"


class SpectroCNN(nn.Module):
    def __init__(self, n_mels: int = 128, n_tabular: int = len(TABULAR_FEATURES)):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),
        )
        self.tab = nn.Sequential(
            nn.Linear(n_tabular, 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 32), nn.ReLU()
        )
        self.head = nn.Sequential(
            nn.Linear(128 * 4 * 4 + 32, 128), nn.ReLU(), nn.Dropout(0.3), nn.Linear(128, 1)
        )
        self.n_mels = n_mels

    def forward(self, mel: torch.Tensor, tab: torch.Tensor) -> torch.Tensor:
        x = self.conv(mel).flatten(1)
        t = self.tab(tab)
        return self.head(torch.cat([x, t], dim=1)).squeeze(-1)


def checkpoint_path() -> Path:
    return settings.model_path / CHECKPOINT


def build() -> SpectroCNN:
    return SpectroCNN(n_mels=settings.n_mels)


def save(model: SpectroCNN, meta: dict) -> Path:
    path = checkpoint_path()
    torch.save({"state_dict": model.state_dict(), "meta": meta}, path)
    return path


_cache: tuple[SpectroCNN, dict] | None = None


def load() -> tuple[SpectroCNN, dict] | None:
    """Load the trained checkpoint, or None when the model has not been trained."""
    global _cache
    if _cache is not None:
        return _cache
    path = checkpoint_path()
    if not path.exists():
        return None
    blob = torch.load(path, map_location="cpu", weights_only=False)
    model = build()
    model.load_state_dict(blob["state_dict"])
    model.eval()
    _cache = (model, blob.get("meta", {}))
    return _cache


def invalidate_cache() -> None:
    global _cache
    _cache = None


def normalize_spectrogram(mel: np.ndarray | torch.Tensor) -> np.ndarray | torch.Tensor:
    """Per-sample instance normalization for spectrograms: (mel - mean) / (std + 1e-6)."""
    if isinstance(mel, np.ndarray):
        m = float(np.mean(mel))
        s = float(np.std(mel))
        return (mel - m) / (s + 1e-6)
    m = mel.mean(dim=(-2, -1), keepdim=True)
    s = mel.std(dim=(-2, -1), keepdim=True)
    return (mel - m) / (s + 1e-6)


def normalize_tabular(
    tab: np.ndarray,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> np.ndarray:
    """Standardize tabular features using training statistics."""
    if tab_mean is not None and tab_std is not None:
        mean = np.asarray(tab_mean, dtype=np.float32)
        std = np.asarray(tab_std, dtype=np.float32)
        return (tab - mean) / (std + 1e-6)
    return tab


@torch.no_grad()
def predict(
    model: SpectroCNN,
    mel: np.ndarray,
    tab: np.ndarray,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> float:
    mel_norm = normalize_spectrogram(mel)
    tab_norm = normalize_tabular(tab, tab_mean, tab_std)
    m = torch.from_numpy(mel_norm).float().unsqueeze(0).unsqueeze(0)
    t = torch.from_numpy(tab_norm).float().unsqueeze(0)
    return float(torch.sigmoid(model(m, t)).item())
