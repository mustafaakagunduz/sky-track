import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "skytrack-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return { theme: next };
    }),
}));

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

applyThemeClass(useThemeStore.getState().theme);
useThemeStore.subscribe((state) => applyThemeClass(state.theme));
