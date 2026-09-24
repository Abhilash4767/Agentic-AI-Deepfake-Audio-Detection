import { Brain } from "lucide-react";
import { useMemo } from "react";
import type { Analysis } from "@/lib/analysis";
import { buildXai } from "@/lib/pipeline";

function heatColor(v: number) {
  // low -> teal (chart-5), high -> red (chart-2)
  return `color-mix(in oklab, var(--chart-2) ${Math.round(v * 100)}%, var(--chart-5))`;
}

function SignedBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="flex w-1/2 justify-end">
        {value < 0 && (
          <div className="h-full rounded-l-full bg-success" style={{ width: `${pct}%` }} />
        )}
      </div>
      <div className="w-1/2">
        {value > 0 && (
          <div className="h-full rounded-r-full bg-destructive" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export function XaiPanel({ analysis }: { analysis: Analysis | null }) {
  const xai = useMemo(() => (analysis ? buildXai(analysis) : null), [analysis]);

  return (
    <section className="panel p-5">
      <p className="label-xs">Explainable AI</p>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Brain className="h-4 w-4 text-primary" /> SHAP · LIME · feature importance · saliency
      </h2>

      {!analysis || !xai ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["SHAP values", "LIME local surrogate", "Feature importance", "Spectrogram heatmap"].map(
            (t) => (
              <div
                key={t}
                className="grid-bg flex h-28 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
              >
                {t} — awaiting analysis
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="label-xs mb-3">SHAP values</p>
            <div className="space-y-3">
              {xai.shap.map((s) => (
                <div key={s.name}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate">{s.name}</span>
                    <span
                      className={`shrink-0 font-mono ${s.value > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {s.value > 0 ? "+" : ""}
                      {s.value.toFixed(3)}
                    </span>
                  </div>
                  <SignedBar value={s.value} max={1} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Positive SHAP values push the prediction toward synthetic; negative values support a
              genuine human recording.
            </p>
          </div>

          <div>
            <p className="label-xs mb-3">LIME local surrogate</p>
            <div className="space-y-3">
              {xai.lime.map((l) => (
                <div key={l.name}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate">{l.name}</span>
                    <span
                      className={`shrink-0 font-mono ${l.weight > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {l.weight > 0 ? "+" : ""}
                      {l.weight.toFixed(2)}
                    </span>
                  </div>
                  <SignedBar value={l.weight} max={1} />
                  <p className="mt-1 text-[11px] text-muted-foreground">{l.support}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="label-xs mb-3">Global feature importance</p>
            <div className="space-y-2.5">
              {xai.importance.map((f) => (
                <div key={f.name}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">{f.score}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, f.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="label-xs mb-3">Spectrogram saliency heatmap</p>
            <div className="overflow-x-auto">
              <div className="min-w-[280px] space-y-1">
                {xai.heatmap.map((row) => (
                  <div key={row.freq} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {row.freq}
                    </span>
                    <div className="flex h-4 flex-1 gap-[2px]">
                      {row.cells.map((c, i) => (
                        <div
                          key={i}
                          title={`${row.freq} @ ${xai.times[i]}s — saliency ${c}`}
                          className="flex-1 rounded-[2px]"
                          style={{ background: heatColor(c), opacity: 0.35 + c * 0.65 }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-12 shrink-0" />
                  <div className="flex flex-1 justify-between font-mono text-[10px] text-muted-foreground">
                    <span>0s</span>
                    <span>{analysis.durationSec}s</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Warmer cells mark time–frequency regions that most influenced the verdict.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
