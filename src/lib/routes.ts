import type { Page } from "../components/TopBar";

export type RouteSection = "support" | "donate";

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

export function isDonatePath(pathname: string): boolean {
  const p = trimSlash(pathname);
  return p === "/donate" || p.endsWith("/donate");
}

const HASH_TO_PAGE: Record<string, Page> = {
  about: "about",
  support: "about",
  donate: "about",
  datacenters: "datacenters",
  economics: "economics",
  history: "history",
  contested: "contested",
  policy: "policy",
  analysis: "portfolio",
  portfolio: "portfolio",
};

export function pageFromLocation(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
  hash = typeof window !== "undefined" ? window.location.hash : "",
): Page {
  if (isForecastPath(pathname)) return "forecast";
  if (isDonatePath(pathname)) return "about";
  const key = hash.replace(/^#/, "").toLowerCase();
  return HASH_TO_PAGE[key] ?? "atlas";
}

export function aboutSectionFromLocation(
  hash = typeof window !== "undefined" ? window.location.hash : "",
): RouteSection | undefined {
  const key = hash.replace(/^#/, "").toLowerCase();
  if (key === "support" || key === "donate") return key;
  return undefined;
}

/** Directory that contains the app (custom domain root or GitHub project path). */
export function appBasePath(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): string {
  const p = trimSlash(pathname);
  if (isForecastPath(p)) {
    const parent = p.replace(/\/forecast(?:-lab)?$/, "");
    return parent === "" ? "/" : `${parent}/`;
  }
  if (isDonatePath(p)) {
    const parent = p.replace(/\/donate$/, "");
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

export function hashForPage(page: Page, section?: RouteSection): string {
  if (page === "about" && section) return `#${section}`;
  if (page === "about") return "#about";
  if (page === "portfolio") return "#analysis";
  if (page === "atlas" || page === "forecast") return "";
  return `#${page}`;
}

export function urlForPage(
  page: Page,
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
  section?: RouteSection,
): string {
  const base = appBasePath(pathname);
  if (page === "forecast") return `${base}forecast/`;
  if (page === "atlas") return base;
  return `${base}${hashForPage(page, section)}`;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url, "https://hypergrid.local");
    const path = u.pathname.endsWith("/") || u.pathname.endsWith(".html") ? u.pathname : `${u.pathname}/`;
    return `${path}${u.hash}`;
  } catch {
    return url;
  }
}

export function syncPageUrl(page: Page, section?: RouteSection): void {
  const next = urlForPage(page, window.location.pathname, section);
  const here = `${window.location.pathname}${window.location.hash}`;
  if (normalizeUrl(here) === normalizeUrl(next)) return;
  const method = isDonatePath(window.location.pathname) ? "replaceState" : "pushState";
  window.history[method]({ page, section }, "", next);
}

/** After a /donate deep link, replace the path with About #support. */
export function replaceDonatePathWithSupportHash(): boolean {
  if (!isDonatePath(window.location.pathname)) return false;
  const dest = urlForPage("about", window.location.pathname, "support");
  window.history.replaceState({ page: "about", section: "support" }, "", dest);
  return true;
}
