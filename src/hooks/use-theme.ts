import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read stored preference or system preference (default dark)
    const stored = localStorage.getItem("verivox-theme") as Theme | null;
    const initialTheme: Theme = stored === "light" ? "light" : "dark";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("verivox-theme", t);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme: (t: Theme) => {
      setTheme(t);
      applyTheme(t);
    },
  };
}
