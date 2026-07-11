import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DEFAULTS = {
  dark:          false,
  c1:            "#f59e0b",
  c2:            "#3b82f6",
  c3:            "#10b981",
  c4:            "#8b5cf6",
  showGrid:      true,
  smoothLines:   true,
  animate:       true,
  cardRadius:    16,
};

const Ctx = createContext(null);

export function ThemeProvider({ children }) {
  const [t, set] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("solar_theme") || "{}") }; }
    catch { return DEFAULTS; }
  });

  useEffect(() => {
    localStorage.setItem("solar_theme", JSON.stringify(t));
    const root = document.documentElement;
    root.classList.toggle("dark", t.dark);
    root.style.setProperty("--c1", t.c1);
    root.style.setProperty("--c2", t.c2);
    root.style.setProperty("--c3", t.c3);
    root.style.setProperty("--c4", t.c4);
    root.style.setProperty("--accent", t.c1);
    root.style.setProperty("--accent-lo", t.c1 + "18");
    root.style.setProperty("--r-md", `${t.cardRadius}px`);
  }, [t]);

  const update  = useCallback((p) => set(prev => ({ ...prev, ...p })), []);
  const reset   = useCallback(()  => set(DEFAULTS), []);

  return <Ctx.Provider value={{ t, update, reset, DEFAULTS }}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
};
