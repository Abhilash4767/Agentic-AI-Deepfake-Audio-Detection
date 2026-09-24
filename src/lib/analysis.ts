// Forensic analysis model + report builders.
// Scoring is either driven by a real external model probability (see
// detection.functions.ts) or by the deterministic built-in simulator.
import { type SupportedLanguage, getDictionary } from "@/lib/report-i18n";

export type Verdict = "authentic" | "deepfake" | "suspicious";

export interface FeatureAttribution {
  name: string;
  weight: number; // -1..1, positive pushes toward deepfake
  detail: string;
}

export interface AgentStep {
  agent: string;
  role: string;
  finding: string;
  confidence: number;
}

export interface Analysis {
  id: string;
  fileName: string;
  sizeKb: number;
  durationSec: number;
  createdAt: string;
  verdict: Verdict;
  confidence: number; // 0..100
  sampleRate: number;
  model: string;
  source: "simulated" | "external";
  audioPath?: string | null;
  recordId?: string;
  waveform: number[];
  spectralBands: { band: string; authentic: number; sample: number }[];
  attributions: FeatureAttribution[];
  agents: AgentStep[];
  summary: string;
  timeline: { t: number; score: number }[];
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const AGENTS: { agent: string; role: string; lines: [string, string] }[] = [
  {
    agent: "Acoustic Agent",
    role: "Spectral & prosody forensics",
    lines: [
      "Formant transitions show machine-smooth interpolation between phonemes.",
      "Prosodic contour and jitter fall inside natural speaker variance.",
    ],
  },
  {
    agent: "Artifact Agent",
    role: "Vocoder fingerprinting",
    lines: [
      "Periodic phase artifacts detected near 7.8 kHz, consistent with neural vocoders.",
      "No vocoder comb pattern found in the high-frequency residual.",
    ],
  },
  {
    agent: "Context Agent",
    role: "Channel & environment coherence",
    lines: [
      "Room reverb tail is inconsistent with the claimed recording environment.",
      "Background noise floor is continuous and physically plausible.",
    ],
  },
  {
    agent: "Adjudicator Agent",
    role: "Evidence fusion & final call",
    lines: [
      "Weighted fusion of sub-agent evidence supports a synthetic-origin verdict.",
      "Weighted fusion of sub-agent evidence supports a human-origin verdict.",
    ],
  },
];

const FEATURES: [string, string][] = [
  ["Vocoder phase artifacts", "Residual phase periodicity in 6-9 kHz band"],
  ["Formant transition smoothness", "Rate of change across phoneme boundaries"],
  ["Micro-prosody jitter", "Cycle-to-cycle F0 perturbation"],
  ["Breath & pause realism", "Distribution of inhalation events"],
  ["Spectral flatness (HF)", "Energy dispersion above 8 kHz"],
  ["Room impulse coherence", "Reverb tail consistency across utterance"],
  ["Shimmer / amplitude noise", "Amplitude perturbation per glottal cycle"],
];

export interface AnalyzeOptions {
  /** Synthetic-speech probability 0..1 returned by a real model. */
  probability?: number;
  model?: string;
  source?: "simulated" | "external";
  durationSec?: number;
  sampleRate?: number;
  thresholdFake?: number;
  thresholdReview?: number;
  audioPath?: string | null;
}

export function analyzeFile(
  file: { name: string; size: number },
  opts: AnalyzeOptions = {},
): Analysis {
  const seed = hash(file.name + file.size);
  const r = rng(seed);
  const tFake = opts.thresholdFake ?? 0.62;
  const tReview = opts.thresholdReview ?? 0.42;
  const score = opts.probability ?? r();
  const verdict: Verdict =
    score > tFake ? "deepfake" : score > tReview ? "suspicious" : "authentic";
  const fake = verdict === "deepfake";
  const confidence =
    opts.probability !== undefined
      ? Number((verdict === "authentic" ? (1 - score) * 100 : score * 100).toFixed(1))
      : verdict === "suspicious"
        ? 55 + r() * 12
        : fake
          ? 84 + r() * 14
          : 88 + r() * 11;

  const durationSec = opts.durationSec ?? 6 + Math.round(r() * 40);
  const waveform = Array.from({ length: 220 }, (_, i) => {
    const env = Math.sin((i / 220) * Math.PI * (2 + r() * 0.01)) * 0.6 + 0.4;
    return Math.min(1, Math.max(0.04, env * (0.35 + r() * 0.75)));
  });

  const attributions = FEATURES.map(([name, detail]) => {
    const base = (r() - 0.35) * 1.4;
    const w = fake ? Math.abs(base) * (0.4 + r() * 0.6) : -Math.abs(base) * (0.4 + r() * 0.6);
    return { name, detail, weight: Math.max(-1, Math.min(1, Number(w.toFixed(2)))) };
  }).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const agents = AGENTS.map((a) => ({
    agent: a.agent,
    role: a.role,
    finding: fake ? a.lines[0] : a.lines[1],
    confidence: Math.round(70 + r() * 29),
  }));

  const spectralBands = ["0-1k", "1-2k", "2-4k", "4-6k", "6-8k", "8-12k", "12k+"].map((band) => ({
    band,
    authentic: Math.round(40 + r() * 45),
    sample: Math.round(40 + r() * 45),
  }));

  const timeline = Array.from({ length: 24 }, (_, i) => ({
    t: Number(((durationSec / 24) * i).toFixed(1)),
    score: Math.round(
      Math.max(2, Math.min(98, score * 100 + (r() - 0.5) * 30 + Math.sin(i / 3) * 8)),
    ),
  }));

  return {
    id: `AN-${seed.toString(36).slice(0, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    fileName: file.name,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    durationSec,
    createdAt: new Date().toISOString(),
    verdict,
    confidence: Number(Number(confidence).toFixed(1)),
    sampleRate: opts.sampleRate ?? 16000,
    model: opts.model ?? "AgenticXAI-Voice v2.4 (simulated ensemble)",
    source: opts.source ?? "simulated",
    audioPath: opts.audioPath ?? null,
    waveform,
    spectralBands,
    attributions,
    agents,
    timeline,
    summary: fake
      ? "The multi-agent panel converged on a synthetic-origin verdict. Vocoder-style phase artifacts and unnaturally smooth formant transitions dominate the evidence, while environmental coherence checks failed."
      : verdict === "suspicious"
        ? "Evidence is mixed. Some segments carry weak synthesis markers while prosody and breath patterns look human. Recommend manual review of the flagged segments."
        : "The multi-agent panel found no reliable synthesis markers. Micro-prosody, breath events and channel characteristics are consistent with a genuine human recording.",
  };
}

export function buildReport(a: Analysis, lang: SupportedLanguage = "en") {
  const dict = getDictionary(lang);
  const line = "=".repeat(72);
  const localizedVerdict = dict.verdicts[a.verdict]?.label || a.verdict.toUpperCase();
  const localizedSummary = dict.verdicts[a.verdict]?.summary || a.summary;

  return `${line}
${dict.title.toUpperCase()}
${dict.subtitle}
${line}
${dict.analysisId.padEnd(14)}: ${a.id}
${dict.fileName.padEnd(14)}: ${a.fileName} (${a.sizeKb} KB, ${a.durationSec}s, ${a.sampleRate} Hz)
${dict.generatedDate.padEnd(14)}: ${new Date(a.createdAt).toUTCString()}
${dict.model.padEnd(14)}: ${a.model} [${a.source}]

${dict.verdictTitle.toUpperCase()} : ${localizedVerdict}
${dict.confidence.toUpperCase()} : ${a.confidence}%

${dict.verdictTitle.toUpperCase()} SUMMARY
${localizedSummary}

${dict.agentTraceTitle.toUpperCase()}
${a.agents
  .map((g) => {
    const localizedAgent = dict.agents[g.agent];
    const agentName = localizedAgent?.name ?? g.agent;
    const agentRole = localizedAgent?.role ?? g.role;
    const agentFinding =
      a.verdict === "deepfake"
        ? localizedAgent?.fakeFinding ?? g.finding
        : a.verdict === "authentic"
          ? localizedAgent?.realFinding ?? g.finding
          : localizedAgent?.suspiciousFinding ?? g.finding;
    return `- [${g.confidence}%] ${agentName} (${agentRole})\n    ${agentFinding}`;
  })
  .join("\n")}

FEATURE ATTRIBUTIONS
${a.attributions
  .map((f) => {
    const localizedName = dict.featureLabels[f.name] ?? f.name;
    return `- ${f.weight > 0 ? "+" : ""}${f.weight.toFixed(2)}  ${localizedName} — ${f.detail}`;
  })
  .join("\n")}

${dict.segmentScoresTitle.toUpperCase()}
${a.timeline.map((p) => `  t=${p.t}s  ${p.score}%`).join("\n")}

${line}
${dict.disclaimerTitle.toUpperCase()}
${dict.disclaimerText}
${line}
`;
}

export function downloadReport(a: Analysis, lang: SupportedLanguage = "en") {
  // \uFEFF is UTF-8 Byte Order Mark, ensuring Windows Notepad and text readers render Indic scripts perfectly
  const content = "\uFEFF" + buildReport(a, lang);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.id}-deepfake-report-${lang}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
