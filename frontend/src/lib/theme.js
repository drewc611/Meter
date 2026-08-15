// Theme is a DOM attribute (data-theme on <html>) read by plain CSS custom
// properties, not React state -- nothing else in the app needs to react to
// it, so there's no reason to thread it through context. index.html has a
// matching inline script that applies the stored choice before first paint,
// so the page never flashes the wrong theme on load.
const STORAGE_KEY = "merit_theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ||
    (!getStoredTheme() && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";
}

export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
