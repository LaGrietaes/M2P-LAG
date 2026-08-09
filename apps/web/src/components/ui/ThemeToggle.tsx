import { useState, useEffect } from "react";

/**
 * ThemeToggle — light/dark switch, persists choice to localStorage (spec §3).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("m2p-theme");
    // Dark is always the first-visit default (mirrors main.tsx — OS
    // auto-detection isn't used, see that file for why).
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("m2p-theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-3 py-1 text-xs font-mono font-bold tracking-widest uppercase text-text-secondary border border-border-subtle hover:bg-surface-elevated transition-colors"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "☀ LIGHT" : "☾ DARK"}
    </button>
  );
}