// theme.js — central theming for the app.
// Components are expected to read CSS variables and the `data-theme` attribute.
// The app supports a configurable theme that the user can change at runtime
// via the Settings panel (see store.js -> state.settings.theme).

export const THEMES = {
  light: { "--bg": "#ffffff", "--fg": "#111827", "--accent": "#2563eb", "--muted": "#6b7280", "--card": "#f9fafb" },
  dark:  { "--bg": "#0b1020", "--fg": "#e5e7eb", "--accent": "#60a5fa", "--muted": "#9ca3af", "--card": "#111827" },
  sepia: { "--bg": "#f4ecd8", "--fg": "#433422", "--accent": "#9a6b2f", "--muted": "#7c6f57", "--card": "#efe4c8" },
};

// Apply a theme by name. Sets data-theme and writes CSS variables on :root.
// IMPORTANT: this mutates the <html> element's style and data-theme attribute.
export function applyTheme(name) {
  const vars = THEMES[name] || THEMES.light;
  const root = document.documentElement;
  root.setAttribute("data-theme", name);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  // Notify listeners that the theme changed.
  document.dispatchEvent(new CustomEvent("theme:changed", { detail: { name } }));
}

export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}
