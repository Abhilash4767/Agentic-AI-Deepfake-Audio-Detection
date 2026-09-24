"""Inference orchestration: features -> CNN (or heuristic fallback) -> XAI."""

from __future__ import annotations

import numpy as np

from . import model as model_mod
from . import xai
from .features import FEATURE_LABELS, TABULAR_FEATURES, AudioFeatures, extract, fixed_mel
from .schemas import Explanation, InferenceResponse

THRESHOLD_FAKE = 0.62
THRESHOLD_REVIEW = 0.42

# Calibrated baseline references for the heuristic fallback scorer:
# {feature_name: (reference_center, reference_scale, weight_sign)}
# weight_sign > 0: higher than reference indicates synthetic speech
# weight_sign < 0: lower than reference indicates synthetic speech
HEURISTIC_CONFIG: dict[str, tuple[float, float, float]] = {
    "tone_consistency": (0.40, 0.12, 1.8),   # synthetic speech is unnaturally flat/consistent
    "voice_stress": (1.50, 0.40, 1.2),       # vocoders exhibit higher frame-to-frame RMS perturbation
    "delta_energy": (2.30, 0.60, 1.0),       # synthetic synthesis creates abrupt delta-MFCC jumps
    "jitter": (0.95, 0.25, -1.8),            # human speech has natural micro-jitter (>1.0); fake has lower jitter
    "high_band_energy": (0.04, 0.03, -1.5),  # vocoders cut off / attenuate energy > 6 kHz
    "harmonic_ratio": (1.28, 0.20, -1.0),    # authentic human voice maintains higher harmonic-to-noise ratio
    "spectral_flatness": (0.015, 0.008, -0.8),# authentic speech has richer formant resonance
    "f0_std": (0.65, 0.15, 0.8),             # unnatural pitch modulation in synthetic voices
}


def verdict_for(p: float) -> str:
    if p >= THRESHOLD_FAKE:
        return "synthetic"
    if p >= THRESHOLD_REVIEW:
        return "review"
    return "authentic"


def _heuristic(feats: AudioFeatures) -> tuple[float, list[dict]]:
    values = feats.as_dict()
    z = 0.0
    attributions: list[dict] = []
    for name, (center, scale, weight) in HEURISTIC_CONFIG.items():
        v = float(values.get(name, center))
        norm_dev = (v - center) / max(scale, 1e-6)
        contrib = weight * np.tanh(norm_dev)
        z += contrib
        attributions.append(
            {
                "feature": FEATURE_LABELS.get(name, name),
                "value": v,
                "weight": float(contrib),
                "direction": "synthetic" if contrib >= 0 else "human",
            }
        )
    p = float(1.0 / (1.0 + np.exp(-np.clip(z, -8.0, 8.0))))
    attributions.sort(key=lambda a: abs(a["weight"]), reverse=True)
    return p, attributions


def analyse(source: str | bytes, file_name: str, explain: bool = True) -> InferenceResponse:
    feats = extract(source)
    mel = fixed_mel(feats.mel)
    tab = feats.tabular

    loaded = model_mod.load()
    explanation: Explanation | None = None

    if loaded is not None:
        net, meta = loaded
        tab_mean = meta.get("tab_mean")
        tab_std = meta.get("tab_std")
        probability = model_mod.predict(net, mel, tab, tab_mean=tab_mean, tab_std=tab_std)
        source_kind = "cnn"
        model_name = meta.get("model_name", "SpectroCNN + prosody fusion")
        if explain:
            shap_list = xai.shap_attributions(
                net, mel, tab, tab_mean=tab_mean, tab_std=tab_std
            )
            lime_list = xai.lime_attributions(
                net, mel, tab, tab_mean=tab_mean, tab_std=tab_std
            )
            saliency = xai.saliency_map(
                net, mel, tab, tab_mean=tab_mean, tab_std=tab_std
            )
            explanation = Explanation(
                shap=shap_list,
                lime=lime_list,
                feature_importance=sorted(
                    [
                        {
                            "feature": FEATURE_LABELS.get(n, n),
                            "value": float(tab[i]),
                            "weight": float(abs(shap_list[0]["weight"]) if shap_list else 0.0),
                            "direction": "synthetic",
                        }
                        for i, n in enumerate(TABULAR_FEATURES)
                    ][:12],
                    key=lambda a: -a["weight"],
                ),
                spectrogram_heatmap=xai.downsample(saliency),
                saliency=[round(float(v), 4) for v in saliency.mean(axis=0)[:96]],
                narrative=xai.narrative(probability, shap_list),
            )
    else:
        probability, attributions = _heuristic(feats)
        source_kind = "heuristic"
        model_name = "Heuristic DSP ensemble (no trained checkpoint yet)"
        if explain:
            explanation = Explanation(
                shap=attributions,
                lime=attributions,
                feature_importance=attributions,
                spectrogram_heatmap=xai.downsample(feats.mel),
                saliency=[round(float(v), 4) for v in feats.mel.mean(axis=0)[:96]],
                narrative=xai.narrative(probability, attributions),
            )

    return InferenceResponse(
        probability=round(probability, 6),
        verdict=verdict_for(probability),
        model=model_name,
        source=source_kind,
        duration_sec=round(feats.duration_sec, 3),
        sample_rate=feats.sample_rate,
        file_name=file_name,
        features={k: round(v, 6) for k, v in feats.as_dict().items()},
        explanation=explanation,
    )
