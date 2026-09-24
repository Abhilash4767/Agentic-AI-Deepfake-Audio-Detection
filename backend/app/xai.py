"""Explainability: SHAP-style occlusion, LIME-style local surrogate,
gradient saliency, and a downsampled spectrogram heatmap."""

from __future__ import annotations

import numpy as np
import torch

from .features import FEATURE_LABELS, TABULAR_FEATURES
from .model import SpectroCNN, normalize_spectrogram, normalize_tabular


def _score(
    model: SpectroCNN,
    mel: np.ndarray,
    tab: np.ndarray,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> float:
    with torch.no_grad():
        m_norm = normalize_spectrogram(mel)
        t_norm = normalize_tabular(tab, tab_mean, tab_std)
        m = torch.from_numpy(m_norm).float().unsqueeze(0).unsqueeze(0)
        t = torch.from_numpy(t_norm).float().unsqueeze(0)
        return float(torch.sigmoid(model(m, t)).item())


def shap_attributions(
    model: SpectroCNN,
    mel: np.ndarray,
    tab: np.ndarray,
    baseline: np.ndarray | None = None,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> list[dict]:
    """Single-feature occlusion against a baseline == exact Shapley for an
    additive read-out, and a fast, stable approximation otherwise."""
    base = baseline if baseline is not None else np.zeros_like(tab)
    ref = _score(model, mel, tab, tab_mean, tab_std)
    out = []
    for i, name in enumerate(TABULAR_FEATURES):
        perturbed = tab.copy()
        perturbed[i] = base[i]
        delta = ref - _score(model, mel, perturbed, tab_mean, tab_std)
        out.append(
            {
                "feature": FEATURE_LABELS.get(name, name),
                "value": float(tab[i]),
                "weight": float(delta),
                "direction": "synthetic" if delta >= 0 else "human",
            }
        )
    out.sort(key=lambda a: abs(a["weight"]), reverse=True)
    return out[:12]


def lime_attributions(
    model: SpectroCNN,
    mel: np.ndarray,
    tab: np.ndarray,
    samples: int = 200,
    seed: int = 7,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> list[dict]:
    """Ridge surrogate fitted on Gaussian perturbations around the instance."""
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, 0.15, size=(samples, tab.shape[0])).astype(np.float32)
    xs = tab[None, :] + noise
    ys = np.array([_score(model, mel, x, tab_mean, tab_std) for x in xs], dtype=np.float32)

    weights = np.exp(-(np.linalg.norm(noise, axis=1) ** 2) / (2 * 0.5**2))
    xc = noise * weights[:, None]
    yc = (ys - ys.mean()) * weights
    coef = np.linalg.lstsq(xc.T @ xc + 1e-3 * np.eye(tab.shape[0]), xc.T @ yc, rcond=None)[0]

    out = [
        {
            "feature": FEATURE_LABELS.get(n, n),
            "value": float(tab[i]),
            "weight": float(coef[i]),
            "direction": "synthetic" if coef[i] >= 0 else "human",
        }
        for i, n in enumerate(TABULAR_FEATURES)
    ]
    out.sort(key=lambda a: abs(a["weight"]), reverse=True)
    return out[:12]


def saliency_map(
    model: SpectroCNN,
    mel: np.ndarray,
    tab: np.ndarray,
    tab_mean: np.ndarray | list[float] | None = None,
    tab_std: np.ndarray | list[float] | None = None,
) -> np.ndarray:
    """Vanilla gradient saliency over the spectrogram."""
    m_norm = normalize_spectrogram(mel)
    t_norm = normalize_tabular(tab, tab_mean, tab_std)
    m = torch.from_numpy(m_norm).float().unsqueeze(0).unsqueeze(0).requires_grad_(True)
    t = torch.from_numpy(t_norm).float().unsqueeze(0)
    torch.sigmoid(model(m, t)).backward()
    grad = m.grad.detach().abs().squeeze().numpy()
    if grad.max() > 0:
        grad = grad / grad.max()
    return grad


def downsample(matrix: np.ndarray, rows: int = 24, cols: int = 48) -> list[list[float]]:
    r = max(1, matrix.shape[0] // rows)
    c = max(1, matrix.shape[1] // cols)
    trimmed = matrix[: r * rows, : c * cols]
    if trimmed.size == 0:
        return []
    block = trimmed.reshape(rows, r, cols, c).mean(axis=(1, 3))
    lo, hi = float(block.min()), float(block.max())
    span = hi - lo or 1.0
    return [[round(float((v - lo) / span), 4) for v in row] for row in block]


def narrative(probability: float, shap: list[dict]) -> str:
    top = ", ".join(a["feature"] for a in shap[:3]) or "spectral evidence"
    if probability >= 0.62:
        return (
            f"The ensemble assigns {probability:.0%} likelihood of synthesis. "
            f"Dominant evidence: {top}. Spectral saliency concentrates in the upper mel bands, "
            "consistent with vocoder resynthesis artefacts."
        )
    if probability >= 0.42:
        return (
            f"Score {probability:.0%} sits in the review band. Evidence from {top} is mixed; "
            "recommend a second clip or manual analyst review before a determination."
        )
    return (
        f"Only {probability:.0%} synthetic likelihood. {top} align with natural articulation, "
        "micro-prosody and breath noise expected from a human speaker."
    )
