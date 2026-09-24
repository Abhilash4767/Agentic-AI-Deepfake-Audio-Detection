import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      className="group relative flex h-8 w-14 cursor-pointer items-center rounded-full border border-border bg-secondary/80 p-1 transition-colors hover:border-primary/60"
    >
      {/* Sliding indicator */}
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-md transition-all duration-300 ${
          isDark ? "translate-x-6 text-primary" : "translate-x-0 text-amber-500"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 transition-transform group-hover:-rotate-12" />
        ) : (
          <Sun className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
        )}
      </span>

      {/* Background icons */}
      <span className="absolute left-1.5 flex h-5 w-5 items-center justify-center text-amber-500/70">
        <Sun className="h-3 w-3" />
      </span>
      <span className="absolute right-1.5 flex h-5 w-5 items-center justify-center text-primary/70">
        <Moon className="h-3 w-3" />
      </span>
    </button>
  );
}
