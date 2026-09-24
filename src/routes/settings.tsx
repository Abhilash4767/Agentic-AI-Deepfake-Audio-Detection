import { createFileRoute } from "@tanstack/react-router";
import { Bell, Cpu, Database, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  useAnalyses,
  useDeleteAllAnalyses,
  useModelSettings,
  useSaveModelSettings,
} from "@/lib/data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Deepfake Audio Detection Console" },
      {
        name: "description",
        content:
          "Configure detection thresholds, agent ensemble, retention policy and alerting for the deepfake audio detection platform.",
      },
      { property: "og:title", content: "Settings — Deepfake Audio Detection Console" },
      {
        property: "og:description",
        content: "Detection thresholds, agent ensemble, retention and alerting preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`h-5 w-9 shrink-0 rounded-full border border-border transition-colors ${value ? "bg-primary" : "bg-surface-2"}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-background transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const [threshold, setThreshold] = useState(62);
  const [cnn, setCnn] = useState(true);
  const [w2v, setW2v] = useState(true);
  const [xai, setXai] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [retention, setRetention] = useState("90");
  const [inferenceUrl, setInferenceUrl] = useState("");
  const [trainingUrl, setTrainingUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const { email: user } = useAuth();
  const { data: items = [] } = useAnalyses();
  const clearAll = useDeleteAllAnalyses();
  const { data: settings } = useModelSettings();
  const saveSettings = useSaveModelSettings();
  const count = items.length;

  useEffect(() => {
    if (!settings) return;
    setThreshold(Math.round(settings.threshold_fake * 100));
    setRetention(String(settings.retention_days));
    setInferenceUrl(settings.inference_url ?? "");
    setTrainingUrl(settings.training_url ?? "");
  }, [settings]);

  async function persist() {
    await saveSettings.mutateAsync({
      threshold_fake: threshold / 100,
      retention_days: Number(retention),
      inference_url: inferenceUrl.trim() || null,
      training_url: trainingUrl.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Tune the agent ensemble, detection thresholds and data retention policy."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5">
          <p className="label-xs">Detection</p>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="h-4 w-4 text-primary" /> Model & thresholds
          </h2>

          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs">
              <span>Deepfake decision threshold</span>
              <span className="font-mono text-primary">{threshold}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              value={threshold}
              aria-label="Deepfake decision threshold"
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Samples above this synthetic likelihood are auto-flagged; lower values increase
              recall.
            </p>
          </div>

          <div className="mt-4 divide-y divide-border border-t border-border">
            <Toggle
              label="CNN Agent"
              hint="Spectro-temporal residual classifier"
              value={cnn}
              onChange={setCnn}
            />
            <Toggle
              label="Wav2Vec2 Agent"
              hint="Self-supervised embedding comparison"
              value={w2v}
              onChange={setW2v}
            />
            <Toggle
              label="XAI Agent"
              hint="Generate SHAP, LIME and saliency artefacts"
              value={xai}
              onChange={setXai}
            />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="label-xs">External model service</p>
            <label className="label-xs mt-3 block" htmlFor="inference-url">
              Inference endpoint URL
            </label>
            <input
              id="inference-url"
              value={inferenceUrl}
              onChange={(e) => setInferenceUrl(e.target.value)}
              placeholder="https://your-gpu-host/predict"
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            />
            <label className="label-xs mt-3 block" htmlFor="training-url">
              Training endpoint URL
            </label>
            <input
              id="training-url"
              value={trainingUrl}
              onChange={(e) => setTrainingUrl(e.target.value)}
              placeholder="https://your-gpu-host/train"
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Leave blank to use the built-in simulated ensemble. Requests are signed server-side
              with your MODEL_API_KEY secret when present.
            </p>
            <button
              onClick={persist}
              className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {saved ? "Saved" : "Save configuration"}
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="label-xs">Alerting</p>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </h2>
            <div className="mt-3 divide-y divide-border border-t border-border">
              <Toggle
                label="Email on deepfake verdict"
                hint={`Sent to ${user ?? "the signed-in analyst"}`}
                value={alerts}
                onChange={setAlerts}
              />
            </div>
          </section>

          <section className="panel p-5">
            <p className="label-xs">Data</p>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" /> Retention & storage
            </h2>
            <label className="label-xs mt-4 block" htmlFor="retention">
              Retention window
            </label>
            <select
              id="retention"
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="0">Keep indefinitely</option>
            </select>
            <p className="mt-3 text-xs text-muted-foreground">
              {count} analysis record{count === 1 ? "" : "s"} stored in your cloud workspace.
            </p>
            <button
              onClick={() => clearAll.mutate()}
              className="mt-3 flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge all stored analyses
            </button>
          </section>

          <section className="panel flex items-start gap-3 p-5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-xs text-muted-foreground">
              Thresholds and endpoints are stored per analyst account; audio stays in your private
              tenant storage.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
