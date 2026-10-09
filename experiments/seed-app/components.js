// components.js — existing UI components, re-rendered on store changes.
import { store } from "./store.js";
import { applyTheme, currentTheme } from "./theme.js";

// Header shows the user and reflects theme changes.
export function mountHeader(root) {
  function render(state) {
    root.innerHTML = `
      <div class="header">
        <span class="brand">Acme Console</span>
        <span class="user">${state.user.name}</span>
      </div>`;
  }
  store.subscribe(render);
  render(store.state);
  // Keep a subtle highlight in sync with theme changes.
  document.addEventListener("theme:changed", () => {
    root.querySelector(".brand")?.classList.add("flash");
  });
}

// Settings panel lets the user change theme/density at runtime.
export function mountSettings(root) {
  function render(state) {
    root.innerHTML = `
      <form class="settings">
        <label>Theme
          <select name="theme">
            ${["light", "dark", "sepia"].map((t) =>
              `<option value="${t}" ${state.settings.theme === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </label>
        <label>Density
          <select name="density">
            ${["comfortable", "compact"].map((d) =>
              `<option value="${d}" ${state.settings.density === d ? "selected" : ""}>${d}</option>`).join("")}
          </select>
        </label>
      </form>`;
    root.querySelector('[name="theme"]').addEventListener("change", (e) => {
      store.setSetting("theme", e.target.value);
      applyTheme(e.target.value);
    });
    root.querySelector('[name="density"]').addEventListener("change", (e) => {
      store.setSetting("density", e.target.value);
    });
  }
  store.subscribe(render);
  render(store.state);
}

// A simple list region other features can render into.
export function mountList(root) {
  function render(state) {
    root.innerHTML = `<ul class="list">${
      state.items.map((it) => `<li data-id="${it.id}">${it.label}</li>`).join("")
    }</ul>`;
  }
  store.subscribe(render);
  render(store.state);
}

export { currentTheme };
