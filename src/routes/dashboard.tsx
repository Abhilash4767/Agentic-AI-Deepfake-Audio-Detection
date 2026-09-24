import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  CheckCircle2,
  Download,
  FileAudio,
  Languages,
  Loader2,
  Mic,
  Play,
  ShieldAlert,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AgentPanel } from "@/components/AgentPanel";
import { AppShell } from "@/components/AppShell";
import { LiveRecorder } from "@/components/LiveRecorder";
import { StatCard } from "@/components/StatCard";
import { Waveform } from "@/components/Waveform";
import { XaiPanel } from "@/components/XaiPanel";
import { downloadReport, type Analysis } from "@/lib/analysis";
import { useAnalyses, uploadToBucket } from "@/lib/data";
import { runAnalysis } from "@/lib/detection.functions";
import { PIPELINE } from "@/lib/pipeline";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/report-i18n";
import { downloadPdfReport } from "@/lib/report-pdf";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Detection Console — VeriVox Deepfake Audio Analysis" },
      {
        name: "description",
        content:
          "Upload audio, inspect the waveform, and review the agentic AI verdict, confidence score and explainable feature attributions.",
      },
      { property: "og:title", content: "Detection Console — VeriVox" },
      {
        property: "og:description",
        content: "Explainable deepfake audio analysis with multi-agent evidence.",
      },
    ],
  }),
  component: Dashboard,
});

const STAGES = PIPELINE.map((a) => `${a.name}: ${a.role}`);

function verdictStyle(v: Analysis["verdict"]) {
  if (v === "deepfake")
    return { label: "Synthetic / Deepfake", color: "text-destructive", Icon: ShieldAlert };
  if (v === "suspicious")
    return { label: "Suspicious — review", color: "text-warning", Icon: TriangleAlert };
  return { label: "Authentic human voice", color: "text-success", Icon: CheckCircle2 };
}

function Dashboard() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [stage, setStage] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestMode, setIngestMode] = useState<"upload" | "record">("upload");
  const [reportLang, setReportLang] = useState<SupportedLanguage>("en");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const analyze = useServerFn(runAnalysis);
  const { data: history = [] } = useAnalyses();

  async function run(file: File) {
    setAnalysis(null);
    setError(null);
    setStage(0);

    const ticker = setInterval(
      () => setStage((s) => (s >= 0 && s < STAGES.length - 1 ? s + 1 : s)),
      620,
    );

    try {
      let audioPath: string | null = null;
      try {
        audioPath = await uploadToBucket("audio-samples", file);
      } catch {
        audioPath = null;
      }
      const res = await analyze({
        data: { fileName: file.name, sizeBytes: file.size, audioPath },
      });
      clearInterval(ticker);
      setStage(-1);
      setAnalysis(res.analysis as Analysis);
      if (res.warning)
        setError(
          `External model unavailable — fell back to the built-in ensemble. (${res.warning})`,
        );
      qc.invalidateQueries({ queryKey: ["analyses"] });
      setPlaying(true);
      setTimeout(() => setPlaying(false), 1200);
    } catch (err) {
      clearInterval(ticker);
      setStage(-1);
      setError(err instanceof Error ? err.message : "Analysis failed.");
    }
  }

  const running = stage >= 0;

  const flagged = history.filter((h) => h.verdict !== "authentic").length;
  const avgConfidence = history.length
    ? (history.reduce((s, h) => s + h.confidence, 0) / history.length).toFixed(1)
    : "—";

  return (
    <AppShell
      title="Detection Console"
      subtitle="Upload a voice sample or record live audio via Web Audio API to run the multi-agent deepfake pipeline."
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Session scans" value={String(history.length)} icon={FileAudio} />
        <StatCard
          label="Flagged samples"
          value={String(flagged)}
          icon={ShieldAlert}
          tone="destructive"
          hint="Deepfake or suspicious"
        />
        <StatCard
          label="Mean confidence"
          value={
            typeof avgConfidence === "string" && avgConfidence === "—" ? "—" : `${avgConfidence}%`
          }
          icon={Activity}
          tone="success"
        />
        <StatCard
          label="Active agents"
          value={`${PIPELINE.length}`}
          icon={Brain}
          tone="warning"
          hint="Upload → XAI chain"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Ingestion: File Upload vs Live Recording */}
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-xs">Step 1</p>
                <h2 className="text-sm font-semibold">Audio ingestion</h2>
              </div>
              
              {/* Ingestion Mode Switcher */}
              <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIngestMode("upload")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                    ingestMode === "upload"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" /> File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode("record")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                    ingestMode === "record"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5 text-cyan-500" /> Live Microphone
                </button>
              </div>
            </div>

            {ingestMode === "upload" ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) run(f);
                }}
                className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/60"
              >
                <Upload className="h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">Drop an audio file or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  WAV · MP3 · FLAC · max 25 MB · Stored in tenant storage and scored server-side.
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) run(f);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <div className="mt-4">
                <LiveRecorder onAnalyze={run} disabled={running} />
              </div>
            )}

            {running && (
              <div className="mt-4 space-y-2">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    {i < stage ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : i === stage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-border" />
                    )}
                    <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Waveform */}
          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-xs">Step 2</p>
                <h2 className="text-sm font-semibold">Waveform & segment scoring</h2>
              </div>
              {analysis && (
                <button
                  onClick={() => {
                    setPlaying(false);
                    setTimeout(() => setPlaying(true), 30);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Play className="h-3.5 w-3.5" /> Replay scan
                </button>
              )}
            </div>

            <div className="mt-4">
              {analysis ? (
                <>
                  <Waveform data={analysis.waveform} verdict={analysis.verdict} playing={playing} />
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.timeline}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="t"
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          unit="s"
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--foreground)",
                          }}
                          formatter={(v: number) => [`${v}% synthetic`, "Segment score"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="grid-bg flex h-40 items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
                  Waveform appears after an analysis run.
                </div>
              )}
            </div>
          </section>

          {/* Explainability */}
          <XaiPanel analysis={analysis} />

          {/* Legacy attribution summary */}
          {analysis && (
            <section className="panel p-5">
              <p className="label-xs">Evidence</p>
              <h2 className="text-sm font-semibold">Spectral bands & agent reasoning trace</h2>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="label-xs mb-3">Spectral band comparison</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.spectralBands}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="band"
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="authentic" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="sample" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Green: human reference distribution · Teal: this sample
                  </p>
                </div>

                <div>
                  <p className="label-xs mb-3">Agent reasoning trace</p>
                  <ol className="space-y-3 border-l border-border pl-4">
                    {analysis.agents.map((a) => (
                      <li key={a.agent} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{a.agent}</p>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {a.confidence}%
                          </span>
                        </div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {a.role}
                        </p>
                        <p className="mt-1 text-xs text-foreground/90">{a.finding}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <AgentPanel analysis={analysis} stage={stage} />

          <section className="panel p-5">
            <p className="label-xs">Prediction</p>
            {analysis ? (
              <>
                {(() => {
                  const v = verdictStyle(analysis.verdict);
                  return (
                    <div className="mt-2 flex items-start gap-3">
                      <v.Icon className={`mt-0.5 h-6 w-6 ${v.color}`} />
                      <div>
                        <p className={`text-lg font-semibold leading-tight ${v.color}`}>
                          {v.label}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{analysis.id}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <p className="label-xs">Confidence</p>
                    <p className="font-mono text-2xl font-semibold">{analysis.confidence}%</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>
                </div>

                <dl className="mt-5 space-y-2 text-xs">
                  {[
                    ["File", analysis.fileName],
                    ["Duration", `${analysis.durationSec}s`],
                    ["Size", `${analysis.sizeKb} KB`],
                    ["Sample rate", `${analysis.sampleRate} Hz`],
                    ["Model", analysis.model],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="truncate text-right font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  {analysis.summary}
                </p>

                {/* Report Language Choice Selector */}
                <div className="mt-4 rounded-md border border-border bg-secondary/30 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="dashboard-report-lang"
                      className="flex items-center gap-1.5 text-[11px] font-medium text-foreground"
                    >
                      <Languages className="h-3.5 w-3.5 text-primary" /> Report Language
                    </label>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {reportLang}
                    </span>
                  </div>
                  <select
                    id="dashboard-report-lang"
                    value={reportLang}
                    onChange={(e) => setReportLang(e.target.value as SupportedLanguage)}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => downloadPdfReport(analysis, reportLang)}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.99]"
                >
                  <Download className="h-4 w-4" /> Download PDF Report
                </button>
                <button
                  onClick={() => downloadReport(analysis, reportLang)}
                  className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" /> Plain-text Transcript ({reportLang.toUpperCase()})
                </button>
              </>
            ) : (
              <div className="mt-3 flex flex-col items-center gap-2 py-8 text-center">
                <FileAudio className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  No sample analysed yet in this session.
                </p>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Recent analyses</p>
            </div>
            <div className="mt-3 space-y-2">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  onClick={() => setAnalysis(h)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-secondary"
                >
                  <span className="truncate">{h.fileName}</span>
                  <span className={verdictStyle(h.verdict).color}>
                    {h.verdict === "deepfake"
                      ? "FAKE"
                      : h.verdict === "suspicious"
                        ? "REVIEW"
                        : "REAL"}
                  </span>
                </button>
              ))}
              {history.length === 0 && (
                <p className="text-xs text-muted-foreground">History is empty.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
