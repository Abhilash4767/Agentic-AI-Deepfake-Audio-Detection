import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Languages, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { downloadReport } from "@/lib/analysis";
import { useAnalyses } from "@/lib/data";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/report-i18n";
import { downloadPdfReport } from "@/lib/report-pdf";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Forensic Reports — Deepfake Audio Detection" },
      {
        name: "description",
        content:
          "Download court-ready PDF forensic reports for every deepfake audio analysis, including agent traces and XAI attributions.",
      },
      { property: "og:title", content: "Forensic Reports — Deepfake Audio Detection" },
      {
        property: "og:description",
        content: "Downloadable PDF forensic reports with agent traces and XAI evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const badge = {
  deepfake: "bg-destructive/15 text-destructive",
  suspicious: "bg-warning/15 text-warning",
  authentic: "bg-success/15 text-success",
} as const;

function ReportsPage() {
  const { data: items = [] } = useAnalyses();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en");

  const flagged = useMemo(() => items.filter((i) => i.verdict !== "authentic").length, [items]);

  return (
    <AppShell
      title="Forensic Reports"
      subtitle="Export signed, court-ready documentation for each audio authenticity analysis in English, Kannada, Hindi, or Telugu."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Reports available" value={String(items.length)} icon={FileText} />
        <StatCard
          label="Flagged cases"
          value={String(flagged)}
          icon={ShieldCheck}
          tone="destructive"
        />
        <StatCard
          label="Format & Languages"
          value="PDF / TXT · 4 Langs"
          icon={Download}
          tone="success"
          hint="English · ಕನ್ನಡ · हिन्दी · తెలుగు"
        />
      </div>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="label-xs">Report library</p>
            <h2 className="text-sm font-semibold">Generated forensic dossiers</h2>
          </div>

          {/* Language choice selector */}
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Export Language:</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground">
            No reports yet — run an analysis in the Detection Console to generate one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li
                key={a.id}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{a.fileName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${badge[a.verdict]}`}
                    >
                      {a.verdict}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {a.id} · {a.confidence}% confidence · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    onClick={() => downloadPdfReport(a, selectedLang)}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF ({selectedLang.toUpperCase()})
                  </button>
                  <button
                    onClick={() => downloadReport(a, selectedLang)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5" /> Plain text ({selectedLang.toUpperCase()})
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
