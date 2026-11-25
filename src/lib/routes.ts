export const PAGES = [
  "atlas",
  "datacenters",
  "economics",
  "history",
  "record",
  "contested",
  "policy",
  "portfolio",
  "signals",
  "compute",
  "about",
] as const;

export type Page = (typeof PAGES)[number];

export interface TabRoute {
  page: Page;
  slug: string;
  label: string;
}

/** Public path for each tab. Atlas also loads at `/`. */
export const TAB_ROUTES: readonly TabRoute[] = [
  { page: "atlas", slug: "atlas", label: "Atlas" },
  { page: "datacenters", slug: "data-centers", label: "Data Centers" },
  { page: "economics", slug: "economics", label: "Economics" },
  { page: "history", slug: "history", label: "History" },
  { page: "record", slug: "record", label: "Record" },
  { page: "contested", slug: "contested", label: "Contested" },
  { page: "policy", slug: "policy", label: "Policy" },
  { page: "portfolio", slug: "analysis", label: "Analysis" },
  { page: "signals", slug: "signals", label: "Signals" },
  { page: "compute", slug: "compute-market", label: "Compute Market" },
  { page: "about", slug: "about", label: "About" },
];

export const PROJECT_PREFIX = "/hyperscaler-energy-atlas";

const SLUG_TO_PAGE = new Map(TAB_ROUTES.map((route) => [route.slug, route.page]));

export function sitePrefix(pathname: string): string {
  if (pathname === PROJECT_PREFIX || pathname.startsWith(`${PROJECT_PREFIX}/`)) return PROJECT_PREFIX;
  return "";
}

function routeRest(pathname: string): string {
  let rest = pathname.slice(sitePrefix(pathname).length);
  rest = rest.replace(/\/index\.html$/i, "");
  rest = rest.replace(/\/+$/, "");
  if (rest.startsWith("/")) rest = rest.slice(1);
  if (rest === "index.html") return "";
  return rest;
}

export function pageFromPath(pathname: string): Page {
  const rest = routeRest(pathname);
  if (!rest || rest === "atlas") return "atlas";
  return SLUG_TO_PAGE.get(rest) ?? "atlas";
}

export function pathForPage(page: Page, pathname: string): string {
  const prefix = sitePrefix(pathname);
  if (page === "atlas") {
    if (routeRest(pathname) === "atlas") return `${prefix}/atlas`;
    return prefix === "" ? "/" : prefix;
  }
  const slug = TAB_ROUTES.find((route) => route.page === page)?.slug ?? "atlas";
  return `${prefix}/${slug}`;
}
