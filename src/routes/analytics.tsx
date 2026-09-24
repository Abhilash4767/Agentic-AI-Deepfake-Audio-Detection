import { createFileRoute } from "@tanstack/react-router";
import { Activity, FileAudio, ShieldAlert, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useAnalyses } from "@/lib/data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Deepfake Audio Detection Platform" },
      {
        name: "description",
        content:
          "Detection volume, verdict distribution, confidence trends and agent throughput across all audio authenticity analyses.",
      },
      { property: "og:title", content: "Analytics — Deepfake Audio Detection" },
      {
        property: "og:description",
        content: "Detection volume, verdict mix and confidence trends across analyses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

function AnalyticsPage() {
  const { data: items = [] } = useAnalyses();

  const stats = useMemo(() => {
    const fake = items.filter((i) => i.verdict === "deepfake").length;
    const review = items.filter((i) => i.verdict === "suspicious").length;
    const real = items.length - fake - review;
    const avg = items.length ? items.reduce((s, i) => s + i.confidence, 0) / items.length : 0;
    const minutes = items.reduce((s, i) => s + i.durationSec, 0) / 60;
    return { fake, review, real, avg, minutes };
  }, [items]);

  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map((day) => {
      const dayItems = items.filter((i) => i.createdAt.slice(0, 10) === day);
      return {
        day: day.slice(5),
        scans: dayItems.length,
        deepfakes: dayItems.filter((i) => i.verdict === "deepfake").length,
      };
    });
  }, [items]);

  const mix = [
    { name: "Authentic", value: stats.real, fill: "var(--chart-5)" },
    { name: "Suspicious", value: stats.review, fill: "var(--chart-3)" },
    { name: "Deepfake", value: stats.fake, fill: "var(--chart-2)" },
  ].filter((s) => s.value > 0);

  const agentLoad = [
    { agent: "Upload", ms: 120 },
    { agent: "Preproc", ms: 340 },
    { agent: "Features", ms: 610 },
    { agent: "CNN", ms: 880 },
    { agent: "Wav2Vec2", ms: 1240 },
    { agent: "Reasoning", ms: 420 },
    { agent: "XAI", ms: 760 },
  ];

  return (
    <AppShell
      title="Analytics"
      subtitle="Detection volume, verdict mix and pipeline throughput across your tenant."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total scans"
          value={String(items.length)}
          icon={FileAudio}
          hint="Stored in your cloud workspace"
        />
        <StatCard
          label="Deepfakes flagged"
          value={String(stats.fake)}
          icon={ShieldAlert}
          tone="destructive"
          hint={`${stats.review} awaiting review`}
        />
        <StatCard
          label="Mean confidence"
          value={`${stats.avg.toFixed(1)}%`}
          icon={TrendingUp}
          tone="success"
          hint="Across all verdicts"
        />
        <StatCard
          label="Audio processed"
          value={`${stats.minutes.toFixed(1)} min`}
          icon={Activity}
          tone="warning"
          hint="Cumulative duration"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel p-5">
          <p className="label-xs">Last 7 days</p>
          <h2 className="text-sm font-semibold">Scan volume vs deepfake detections</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="scans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="var(--chart-1)"
                  fill="url(#scans)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="deepfakes"
                  stroke="var(--chart-2)"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <p className="label-xs">Distribution</p>
          <h2 className="text-sm font-semibold">Verdict mix</h2>
          <div className="mt-4 h-64">
            {mix.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {mix.map((m) => (
                      <Cell key={m.name} fill={m.fill} stroke="var(--surface)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                Run an analysis to populate the verdict mix.
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            {[
              { name: "Authentic", fill: "var(--chart-5)", value: stats.real },
              { name: "Suspicious", fill: "var(--chart-3)", value: stats.review },
              { name: "Deepfake", fill: "var(--chart-2)", value: stats.fake },
            ].map((l) => (
              <span
                key={l.name}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: l.fill }} />
                {l.name} · {l.value}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-5 p-5">
        <p className="label-xs">Pipeline</p>
        <h2 className="text-sm font-semibold">Mean agent latency (ms)</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agentLoad}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="agent"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="ms" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </AppShell>
  );
}
