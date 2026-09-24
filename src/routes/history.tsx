import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Languages, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { downloadReport, type Analysis } from "@/lib/analysis";
import { useAnalyses, useDeleteAllAnalyses } from "@/lib/data";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/report-i18n";
import { downloadPdfReport } from "@/lib/report-pdf";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Analysis History — VeriVox Deepfake Audio Detection" },
      {
        name: "description",
        content:
          "Browse past deepfake audio analyses, verdicts and confidence scores, and re-download forensic reports.",
      },
      { property: "og:title", content: "Analysis History — VeriVox" },
      {
        property: "og:description",
        content: "Past deepfake audio verdicts, confidence scores and downloadable reports.",
      },
    ],
  }),
  component: HistoryPage,
});

const badge = {
  deepfake: "bg-destructive/15 text-destructive",
  suspicious: "bg-warning/15 text-warning",
  authentic: "bg-success/15 text-success",
} as const;

function HistoryPage() {
  const { data: items = [] } = useAnalyses();
  const clearAll = useDeleteAllAnalyses();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Analysis["verdict"]>("all");
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en");

  const rows = useMemo(
    () =>
      items.filter(
        (i) =>
          (filter === "all" || i.verdict === filter) &&
          i.fileName.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [items, q, filter],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      fake: items.filter((i) => i.verdict === "deepfake").length,
      review: items.filter((i) => i.verdict === "suspicious").length,
      avg: items.length
        ? (items.reduce((s, i) => s + i.confidence, 0) / items.length).toFixed(1)
        : "—",
    }),
    [items],
  );

  return (
    <AppShell
      title="Analysis History"
      subtitle="Every sample processed by the agentic pipeline in this workspace."
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total analyses", String(stats.total)],
          ["Flagged deepfake", String(stats.fake)],
          ["Pending review", String(stats.review)],
          ["Avg. confidence", stats.avg === "—" ? "—" : `${stats.avg}%`],
        ].map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="label-xs">{k}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search file name"
              className="h-9 w-56 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Report Language Selector */}
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
              <Languages className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
                className="bg-transparent text-xs font-medium text-foreground outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            {(["all", "deepfake", "suspicious", "authentic"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                  filter === f
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => clearAll.mutate()}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Analysis ID", "File", "Date", "Verdict", "Confidence", "Export Report"].map(
                  (h) => (
                    <th key={h} className="label-xs px-4 py-3 font-normal">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="max-w-[220px] truncate px-4 py-3">{r.fileName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${badge[r.verdict]}`}
                    >
                      {r.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.confidence}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadPdfReport(r, selectedLang)}
                        className="flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        title="Download PDF Dossier"
                      >
                        <Download className="h-3 w-3" /> PDF ({selectedLang.toUpperCase()})
                      </button>
                      <button
                        onClick={() => downloadReport(r, selectedLang)}
                        className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        title="Download Text Transcript"
                      >
                        <FileText className="h-3 w-3" /> TXT
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No analyses match this view. Run a detection from the console.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
