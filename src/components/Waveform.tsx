import { useEffect, useState } from "react";

export function Waveform({
  data,
  verdict,
  playing,
}: {
  data: number[];
  verdict: "authentic" | "deepfake" | "suspicious";
  playing?: boolean;
}) {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!playing) return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          clearInterval(id);
          return 1;
        }
        return p + 0.02;
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing, data]);

  const color =
    verdict === "deepfake"
      ? "var(--destructive)"
      : verdict === "suspicious"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="grid-bg relative h-40 w-full overflow-hidden rounded-md border border-border bg-background/50 p-3">
      <div className="flex h-full items-center gap-[2px]">
        {data.map((v, i) => {
          const reached = i / data.length <= progress;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-[height,background-color] duration-200"
              style={{
                height: `${Math.max(4, v * 100)}%`,
                backgroundColor: reached ? color : "var(--surface-2)",
                opacity: reached ? 0.55 + v * 0.45 : 0.6,
              }}
            />
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-primary"
        style={{ left: `${progress * 100}%`, opacity: progress < 1 ? 1 : 0 }}
      />
    </div>
  );
}
