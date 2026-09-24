import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import type { Analysis } from "@/lib/analysis";
import { agentStatus, PIPELINE } from "@/lib/pipeline";

export function AgentPanel({ analysis, stage }: { analysis: Analysis | null; stage: number }) {
  const done = !!analysis && stage < 0;

  return (
    <section className="panel p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="label-xs">Agentic reasoning</p>
          <h2 className="truncate text-sm font-semibold">Multi-agent pipeline</h2>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          {done ? "7/7 complete" : stage >= 0 ? `${stage}/7 running` : "idle"}
        </span>
      </div>

      <ol className="mt-4 space-y-2.5">
        {PIPELINE.map((agent, i) => {
          const status = agentStatus(i, stage, done);
          return (
            <li
              key={agent.key}
              className={`rounded-md border px-3 py-2.5 transition-colors ${
                status === "running"
                  ? "border-primary/50 bg-primary/5"
                  : status === "complete"
                    ? "border-border bg-surface-2/60"
                    : "border-border/60 bg-background/30"
              }`}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                {status === "complete" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : status === "running" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{agent.name}</p>
                  <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                    {agent.role}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                    status === "complete"
                      ? "bg-success/15 text-success"
                      : status === "running"
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {status === "complete" ? "done" : status}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {agent.detail(status === "idle" ? null : analysis)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
