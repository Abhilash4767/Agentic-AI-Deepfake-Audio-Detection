import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AudioWaveform,
  BarChart3,
  FileText,
  Brain,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/dashboard", label: "Detection Console", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/history", label: "Analysis History", icon: History },
  { to: "/training", label: "Model Training", icon: Brain },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { email, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const user = email;

  useEffect(() => {
    if (!loading && !email) navigate({ to: "/", replace: true });
  }, [loading, email, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="flex items-center gap-2 px-2">
        <AudioWaveform className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">VeriVox</p>
          <p className="label-xs">Agentic XAI</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 rounded-md border border-border bg-surface-2 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
          Pipeline healthy · v2.4
        </div>
        <p className="truncate font-mono text-xs text-foreground">{user ?? "—"}</p>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/60 lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface/40 px-4 py-4 sm:px-6">
          <button
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 lg:col-start-2">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="label-xs hidden md:inline">
              Session · {new Date().toISOString().slice(0, 10)}
            </span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
