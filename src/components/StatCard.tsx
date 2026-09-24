export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <div className="panel grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
      <div className="min-w-0">
        <p className="label-xs truncate">{label}</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold leading-none">{value}</p>
        {hint && <p className="mt-2 truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}
