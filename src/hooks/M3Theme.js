import { useMemo } from "react";
import { useDarkMode } from "./ColorMode";
import { THEME_DARK, THEME_LIGHT } from "../config";
import {
  createM3CssVariables,
  M3_GLOBAL_CSS,
  resolveM3Colors,
  resolveM3ThemeMode,
} from "../styles/m3";
import { useSystemDarkPreference } from "./SystemColorScheme";

const M3_BRAND_COLOR = "blue";

/**
 * Lightweight theme wrapper. The panel only needs the M3 CSS variables, the
 * global stylesheet and the active color-scheme flag; MUI's theme engine is
 * intentionally not used.
 */
export default function M3Theme({ children }) {
  const { darkMode } = useDarkMode();
  const systemPrefersDark = useSystemDarkPreference();

  const previewMode =
    process.env.NODE_ENV === "development"
      ? new URLSearchParams(window.location.search).get("theme")
      : null;
  const resolvedMode =
    previewMode === THEME_DARK || previewMode === THEME_LIGHT
      ? previewMode
      : resolveM3ThemeMode(darkMode, systemPrefersDark);
  const colors = useMemo(
    () => resolveM3Colors(resolvedMode, M3_BRAND_COLOR),
    [resolvedMode]
  );

  return (
    <div
      className="kt-m3-root"
      data-theme={resolvedMode}
      data-brand={M3_BRAND_COLOR}
      style={{
        ...createM3CssVariables(colors),
        colorScheme: resolvedMode,
      }}
    >
      <style>{M3_GLOBAL_CSS}</style>
      {children}
    </div>
  );
}
