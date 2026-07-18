import { useTranslation } from "react-i18next";
import { useThemeStore } from "../store/themeStore";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
      className="rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
