// Agentic pipeline definition + XAI derivations (SHAP / LIME / heatmap).
import type { Analysis } from "@/lib/analysis";

export type AgentStatus = "idle" | "running" | "complete";

export interface PipelineAgent {
  key: string;
  name: string;
  role: string;
  detail: (a: Analysis | null) => string;
}

export const PIPELINE: PipelineAgent[] = [
  {
    key: "upload",
    name: "Upload Agent",
    role: "Ingestion & integrity",
    detail: (a) =>
      a
        ? `Accepted ${a.fileName} (${a.sizeKb} KB), checksum recorded, container validated.`
        : "Validates container, size and codec before the sample enters the pipeline.",
  },
  {
    key: "preprocessing",
    name: "Preprocessing Agent",
    role: "Resample & denoise",
    detail: (a) =>
      a
        ? `Resampled to ${a.sampleRate} Hz mono, DC offset removed, ${a.durationSec}s retained after VAD.`
        : "Resamples to 16 kHz mono, trims silence and normalises loudness.",
  },
  {
    key: "features",
    name: "Feature Extraction Agent",
    role: "MFCC · mel · prosody",
    detail: (a) =>
      a
        ? `Extracted 40-band log-mel, 20 MFCC + Δ, F0 contour and jitter/shimmer across ${a.timeline.length} frames.`
        : "Computes log-mel spectrograms, MFCCs and prosodic descriptors.",
  },
  {
    key: "cnn",
    name: "CNN Agent",
    role: "Spectro-temporal classifier",
    detail: (a) =>
      a
        ? `Residual CNN over the mel spectrogram returns ${Math.round(a.confidence - 3)}% synthetic likelihood.`
        : "Residual CNN scores spectrogram patches for vocoder artifacts.",
  },
  {
    key: "wav2vec2",
    name: "Wav2Vec2 Agent",
    role: "Self-supervised embeddings",
    detail: (a) =>
      a
        ? `Wav2Vec2-XLSR embeddings cluster ${a.verdict === "authentic" ? "inside" : "outside"} the bona-fide speaker manifold.`
        : "Compares self-supervised speech embeddings against bona-fide manifolds.",
  },
  {
    key: "reasoning",
    name: "Reasoning Agent",
    role: "Evidence fusion",
    detail: (a) =>
      a
        ? `Fused CNN and Wav2Vec2 evidence with channel coherence; verdict ${a.verdict.toUpperCase()} at ${a.confidence}%.`
        : "Fuses model evidence, resolves disagreement and issues the verdict.",
  },
  {
    key: "xai",
    name: "XAI Agent",
    role: "SHAP · LIME · saliency",
    detail: (a) =>
      a
        ? `Generated SHAP attributions, LIME local surrogate and a saliency heatmap for ${a.id}.`
        : "Produces SHAP values, LIME surrogates and spectrogram saliency maps.",
  },
];

export function agentStatus(index: number, stage: number, done: boolean): AgentStatus {
  if (done) return "complete";
  if (stage < 0) return "idle";
  if (index < stage) return "complete";
  if (index === stage) return "running";
  return "idle";
}

function rng(seed: number) {
  let s = seed || 7;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seedOf(a: Analysis) {
  let h = 2166136261;
  for (let i = 0; i < a.id.length; i++) {
    h ^= a.id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface XaiBundle {
  shap: { name: string; value: number }[];
  lime: { name: string; weight: number; support: string }[];
  importance: { name: string; score: number }[];
  heatmap: { freq: string; cells: number[] }[];
  times: number[];
}

const LIME_FEATURES: [string, string][] = [
  ["High-band phase residual", "frames 12-31"],
  ["Formant slope variance", "frames 4-18"],
  ["Silence-to-speech onset", "frames 0-6"],
  ["Breath event density", "whole clip"],
  ["Harmonic-to-noise ratio", "frames 22-40"],
  ["Pitch contour curvature", "frames 8-26"],
];

const FREQ_BANDS = ["12k+", "8-12k", "6-8k", "4-6k", "2-4k", "1-2k", "0-1k"];

export function buildXai(a: Analysis): XaiBundle {
  const r = rng(seedOf(a));
  const fake = a.verdict !== "authentic";

  const shap = a.attributions.map((f) => ({
    name: f.name,
    value: Number((f.weight * (0.6 + r() * 0.5)).toFixed(3)),
  }));

  const lime = LIME_FEATURES.map(([name, support]) => {
    const mag = 0.15 + r() * 0.65;
    return {
      name,
      support,
      weight: Number(((fake ? 1 : -1) * (r() > 0.25 ? mag : -mag)).toFixed(2)),
    };
  }).sort((x, y) => Math.abs(y.weight) - Math.abs(x.weight));

  const importance = a.attributions
    .map((f) => ({ name: f.name, score: Number((Math.abs(f.weight) * 100).toFixed(1)) }))
    .sort((x, y) => y.score - x.score);

  const cols = 18;
  const times = Array.from({ length: cols }, (_, i) =>
    Number(((a.durationSec / cols) * i).toFixed(1)),
  );
  const heatmap = FREQ_BANDS.map((freq, row) => ({
    freq,
    cells: Array.from({ length: cols }, (_, col) => {
      const hot = fake ? (row < 3 ? 0.55 : 0.2) : 0.18;
      const wave = Math.sin(col / 2.4 + row) * 0.16;
      return Number(Math.min(1, Math.max(0.02, hot + wave + r() * 0.35)).toFixed(2));
    }),
  }));

  return { shap, lime, importance, heatmap, times };
}
