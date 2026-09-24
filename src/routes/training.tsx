import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Sliders,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import {
  useAddTrainingSample,
  useDeleteTrainingSample,
  useModelSettings,
  useTrainingRuns,
  useTrainingSamples,
} from "@/lib/data";
import { startTrainingRun, syncTrainingRun } from "@/lib/detection.functions";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Model Training — Deepfake Audio Detection" },
      {
        name: "description",
        content:
          "Build a labelled real-vs-fake audio dataset and launch training jobs on your external GPU training service.",
      },
      { property: "og:title", content: "Model Training — Deepfake Audio Detection" },
      {
        property: "og:description",
        content: "Label audio, stage a dataset and dispatch external training jobs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingPage,
});

const statusStyle: Record<string, string> = {
  queued: "bg-warning/15 text-warning",
  running: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function TrainingPage() {
  const qc = useQueryClient();
  const { data: samples = [] } = useTrainingSamples();
  const { data: runs = [] } = useTrainingRuns();
  const { data: settings } = useModelSettings();
  const addSample = useAddTrainingSample();
  const deleteSample = useDeleteTrainingSample();
  const start = useServerFn(startTrainingRun);
  const sync = useServerFn(syncTrainingRun);

  // Fetch live stats from local Python backend
  const { data: backendStats } = useQuery({
    queryKey: ["backend_dataset_stats"],
    queryFn: async () => {
      try {
        const res = await fetch("http://localhost:8000/dataset/stats", {
          headers: { Authorization: "Bearer verivox-secret-key" },
        });
        if (!res.ok) return null;
        return (await res.json()) as {
          real: number;
          fake: number;
          total: number;
          total_seconds: number;
          balance: number;
        };
      } catch {
        return null;
      }
    },
    refetchInterval: 4000,
  });

  // Fetch training runs/jobs from local Python backend
  const { data: backendJobs = [] } = useQuery({
    queryKey: ["backend_training_jobs"],
    queryFn: async () => {
      try {
        const res = await fetch("http://localhost:8000/jobs", {
          headers: { Authorization: "Bearer verivox-secret-key" },
        });
        if (!res.ok) return [];
        return (await res.json()) as Array<{
          job_id: string;
          name: string;
          status: string;
          epochs: number;
          dataset_size: number;
          accuracy: number | null;
          val_accuracy: number | null;
          message: string | null;
          started_at: string;
          completed_at: string | null;
        }>;
      } catch {
        return [];
      }
    },
    refetchInterval: 4000,
  });

  const [engineMode, setEngineMode] = useState<"local" | "cloud">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("verivox_training_mode");
      if (saved === "local" || saved === "cloud") return saved;
    }
    return "local";
  });

  const [label, setLabel] = useState<"real" | "fake">("real");
  const [runName, setRunName] = useState("for-norm-v2");
  const [epochs, setEpochs] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount =
    engineMode === "local"
      ? (backendStats ? backendStats.total : 6000)
      : samples.length;

  const realCount =
    engineMode === "local"
      ? (backendStats ? backendStats.real : 3000)
      : samples.filter((s) => s.label === "real").length;

  const fakeCount =
    engineMode === "local"
      ? (backendStats ? backendStats.fake : 3000)
      : samples.filter((s) => s.label === "fake").length;

  const displayedRuns = useMemo(() => {
    if (engineMode === "local") {
      return backendJobs.map((j) => ({
        id: j.job_id,
        name: j.name,
        status: j.status,
        epochs: j.epochs,
        dataset_size: j.dataset_size,
        accuracy: j.accuracy,
        val_accuracy: j.val_accuracy,
        message: j.message,
        created_at: j.started_at,
        isLocal: true,
      }));
    }
    return runs.map((r) => ({
      ...r,
      isLocal: false,
    }));
  }, [engineMode, backendJobs, runs]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await addSample.mutateAsync({ file, label });
      }
      setMsg(`${files.length} clip(s) added as "${label}".`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function launch() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (engineMode === "local") {
        const res = await fetch("http://localhost:8000/train", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer verivox-secret-key",
          },
          body: JSON.stringify({
            name: runName,
            epochs,
            batch_size: 32,
            learning_rate: 0.001,
            val_split: 0.2,
            samples: [],
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || "Training trigger failed.");
        }
        const data = await res.json();
        setMsg(data.message ?? `Local training queued with ${totalCount} samples.`);
        qc.invalidateQueries({ queryKey: ["backend_training_jobs"] });
      } else {
        const res = await start({ data: { name: runName, epochs } });
        setMsg(res.message ?? `Run ${res.status} with ${res.datasetSize} samples.`);
        qc.invalidateQueries({ queryKey: ["training_runs"] });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start training.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(id: string) {
    setErr(null);
    try {
      qc.invalidateQueries({ queryKey: ["backend_training_jobs"] });
      const res = await sync({ data: { id } });
      setMsg(res.message ?? `Status: ${res.status}`);
      qc.invalidateQueries({ queryKey: ["training_runs"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not refresh run.");
    }
  }

  return (
    <AppShell
      title="Model Training"
      subtitle="Curate a labelled dataset and train deep neural models on your local engine or external GPU."
    >
      {/* Mode Switcher: Local PyTorch Engine vs Cloud Workspace */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 p-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground ml-1">Training Environment:</span>
          <div className="inline-flex rounded-lg bg-muted/70 p-1">
            <button
              onClick={() => {
                setEngineMode("local");
                localStorage.setItem("verivox_training_mode", "local");
              }}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                engineMode === "local"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Local PyTorch Engine</span>
              {backendStats ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
              ) : (
                <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground">Port 8000</span>
              )}
            </button>

            <button
              onClick={() => {
                setEngineMode("cloud");
                localStorage.setItem("verivox_training_mode", "cloud");
              }}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                engineMode === "cloud"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Cloud / Remote GPU</span>
              <span className={`rounded px-1.5 py-0.2 text-[9px] ${settings?.training_url ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                {settings?.training_url ? "Connected" : "Standby"}
              </span>
            </button>
          </div>
        </div>

        <div className="mr-2 text-xs text-muted-foreground">
          {engineMode === "local" ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
              <span className="font-mono font-medium text-foreground">backend/data/dataset</span>
              <span>· 6,000 FoR Samples Active</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
              <span className="font-mono font-medium text-foreground">Supabase Storage</span>
              <span>· Remote Staged Dataset</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={engineMode === "local" ? "Local dataset size" : "Cloud dataset size"}
          value={String(totalCount)}
          icon={Database}
        />
        <StatCard
          label="Authentic clips"
          value={String(realCount)}
          icon={Brain}
          tone="success"
        />
        <StatCard
          label="Synthetic clips"
          value={String(fakeCount)}
          icon={Brain}
          tone="destructive"
        />
        <StatCard
          label={engineMode === "local" ? "PyTorch Engine" : "Training Service"}
          value={
            engineMode === "local"
              ? (backendStats ? "Active (Port 8000)" : "Connecting...")
              : (settings?.training_url ? "Connected" : "Not configured")
          }
          icon={engineMode === "local" ? Cpu : Play}
          tone={
            engineMode === "local"
              ? (backendStats ? "success" : "warning")
              : (settings?.training_url ? "success" : "warning")
          }
          hint={
            engineMode === "local"
              ? "SpectroCNN + Prosody Fusion"
              : "Configure URL in Settings"
          }
        />
      </div>

      {(msg || err) && (
        <p className={`mt-4 text-xs ${err ? "text-destructive" : "text-success"}`}>{err ?? msg}</p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {engineMode === "local" ? (
          <section className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-xs">On-Premise Machine Learning</p>
                <h2 className="text-sm font-semibold">Local FoR Audio Dataset</h2>
              </div>
              <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {totalCount.toLocaleString()} Clips Staged
              </span>
            </div>

            <div className="rounded-md border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Dataset Source: FoR (for-norm)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Balanced 50% Authentic / 50% Synthetic speech normalized at 16 kHz.
                  </p>
                </div>
                <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                  Balanced 1:1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="rounded-md border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Authentic Human</p>
                    <span className="h-2 w-2 rounded-full bg-success"></span>
                  </div>
                  <p className="text-xl font-bold text-success mt-1">{realCount.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                    backend/data/dataset/real
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Synthetic Deepfake</p>
                    <span className="h-2 w-2 rounded-full bg-destructive"></span>
                  </div>
                  <p className="text-xl font-bold text-destructive mt-1">{fakeCount.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                    backend/data/dataset/fake
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Precomputed Feature Tensor Cache</span>
                </div>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  787 MB Active
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Log-mel spectrograms and 18 tabular prosody features are pre-extracted and stored in{" "}
                <code className="font-mono text-primary">backend/data/features_cache.pt</code>. The neural network can
                retrain in under 30 seconds without recalculating acoustic sound waves.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card/40 p-4">
              <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-primary" /> Feature Extraction & Network Specifications
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="bg-muted/40 p-2 rounded border border-border/40">Sampling: 16,000 Hz</div>
                <div className="bg-muted/40 p-2 rounded border border-border/40">Mel Bins: 128</div>
                <div className="bg-muted/40 p-2 rounded border border-border/40">MFCCs: 40</div>
                <div className="bg-muted/40 p-2 rounded border border-border/40">Window: Hann (25ms)</div>
                <div className="bg-muted/40 p-2 rounded border border-border/40">Batch Size: 32</div>
                <div className="bg-muted/40 p-2 rounded border border-border/40">Loss: BCEWithLogits</div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/50 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Active Model Checkpoint: <strong className="text-foreground">backend/models/deepfake_cnn.pt</strong>
                </p>
              </div>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["backend_dataset_stats", "backend_training_jobs"] })}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </section>
        ) : (
          <section className="panel p-5">
            <p className="label-xs">Cloud Storage</p>
            <h2 className="text-sm font-semibold">Staged Cloud Clips (Supabase)</h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["real", "fake"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                    label === l
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Label as {l}
                </button>
              ))}
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files);
              }}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-background/40 px-6 py-8 text-center transition-colors hover:border-primary/60"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
              <p className="mt-3 text-sm font-medium">Drop clips or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Files are stored in private cloud storage and dispatched via signed links.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto">
              {samples.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No cloud training clips yet. Switch to Local PyTorch Engine to see your 6,000 disk clips.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {samples.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs">{s.file_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {s.size_kb} KB · {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                            s.label === "fake"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {s.label}
                        </span>
                        <button
                          aria-label={`Delete ${s.file_name}`}
                          onClick={() => deleteSample.mutate(s)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="label-xs">
              {engineMode === "local" ? "Local Execution" : "Remote Dispatch"}
            </p>
            <h2 className="text-sm font-semibold">
              {engineMode === "local" ? "New PyTorch Training Run" : "New Cloud Training Run"}
            </h2>

            <label className="label-xs mt-4 block" htmlFor="run-name">
              Run name
            </label>
            <input
              id="run-name"
              value={runName}
              maxLength={80}
              onChange={(e) => setRunName(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none font-mono"
            />

            <label className="label-xs mt-4 block" htmlFor="epochs">
              Epochs
            </label>
            <input
              id="epochs"
              type="number"
              min={1}
              max={500}
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none font-mono"
            />

            <button
              onClick={launch}
              disabled={busy || totalCount === 0}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {engineMode === "local" ? "Start Local Training" : "Dispatch to Cloud GPU"}
            </button>

            {engineMode === "local" ? (
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                Trains SpectroCNN + prosody tabular MLP on {totalCount.toLocaleString()} clips via local worker threads. Checkpoints save to <code className="font-mono text-primary">backend/models/deepfake_cnn.pt</code>.
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                {settings?.training_url
                  ? "Connected to external GPU endpoint."
                  : "No training endpoint configured — configure external URL in Settings to dispatch."}
              </p>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-xs">History</p>
                <h2 className="text-sm font-semibold">
                  {engineMode === "local" ? "Local Training Runs" : "Cloud Training Runs"}
                </h2>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {displayedRuns.length} run{displayedRuns.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {displayedRuns.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {engineMode === "local"
                    ? "No local runs recorded yet."
                    : "No cloud runs dispatched yet."}
                </p>
              )}
              {displayedRuns.map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="truncate text-xs font-semibold">{r.name}</p>
                      {r.isLocal && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-medium text-primary">
                          PyTorch
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-semibold ${statusStyle[r.status] ?? ""}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {r.dataset_size?.toLocaleString()} samples · {r.epochs} epochs
                    {r.accuracy != null ? ` · train ${(r.accuracy * 100).toFixed(1)}%` : ""}
                    {"val_accuracy" in r && r.val_accuracy != null
                      ? ` · val ${(Number(r.val_accuracy) * 100).toFixed(1)}%`
                      : ""}
                  </p>
                  {r.message && (
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {r.message}
                    </p>
                  )}
                  <button
                    onClick={() => refresh(r.id)}
                    className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Refresh status
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
