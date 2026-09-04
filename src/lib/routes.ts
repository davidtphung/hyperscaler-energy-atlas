import type { Page } from "../components/TopBar";

function stripIndex(pathname: string): string {
  return pathname.replace(/\/index\.html$/i, "/");
}

function trimSlash(pathname: string): string {
  const p = stripIndex(pathname);
  if (p === "/") return "/";
  return p.replace(/\/+$/, "") || "/";
}

export function isForecastPath(pathname: string): boolean {
  const p = trimSlash(pathname);
  return p === "/forecast" || p === "/forecast-lab" || p.endsWith("/forecast") || p.endsWith("/forecast-lab");
}

export function pageFromLocation(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): Page {
  return isForecastPath(pathname) ? "forecast" : "atlas";
}

/** Directory that contains the app (custom domain root or GitHub project path). */
export function appBasePath(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): string {
  const p = trimSlash(pathname);
  if (isForecastPath(p)) {
    const parent = p.replace(/\/forecast(?:-lab)?$/, "");
    return parent === "" ? "/" : `${parent}/`;
  }
  if (p === "/") return "/";
  // File URL like /index.html already stripped; stay on this directory.
  const last = p.split("/").pop() ?? "";
  if (last.includes(".")) {
    const dir = p.slice(0, p.lastIndexOf("/") + 1);
    return dir || "/";
  }
  return `${p}/`;
}

export function urlForPage(page: Page, pathname = typeof window !== "undefined" ? window.location.pathname : "/"): string {
  const base = appBasePath(pathname);
  if (page === "forecast") return `${base}forecast/`;
  return base;
}

export function syncPageUrl(page: Page): void {
  const next = urlForPage(page);
  const here = window.location.pathname.endsWith("/") || window.location.pathname.endsWith(".html")
    ? window.location.pathname
    : `${window.location.pathname}/`;
  const normalizedHere = isForecastPath(window.location.pathname)
    ? urlForPage("forecast")
    : appBasePath();
  const normalizedNext = page === "forecast" ? urlForPage("forecast") : appBasePath();
  if (normalizedHere === normalizedNext && (page === "forecast" || !isForecastPath(window.location.pathname))) {
    if (page === "forecast" && here !== next) {
      window.history.replaceState({ page }, "", next);
    }
    return;
  }
  window.history.pushState({ page }, "", next);
}
