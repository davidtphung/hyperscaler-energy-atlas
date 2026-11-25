import fs from "node:fs";
import { TAB_ROUTES, pageFromPath, pathForPage } from "../src/lib/routes.ts";
import { readUrl, writeUrl } from "../src/lib/url.ts";

const errors: string[] = [];
function fail(message: string) {
  errors.push(message);
}

const slugs = new Set<string>();
for (const route of TAB_ROUTES) {
  if (slugs.has(route.slug)) fail(`duplicate slug ${route.slug}`);
  slugs.add(route.slug);
  if (pageFromPath(`/${route.slug}`) !== route.page) fail(`${route.slug} did not map to ${route.page}`);
  if (pageFromPath(`/${route.slug}/`) !== route.page) fail(`${route.slug}/ did not map`);
  if (pageFromPath(`/${route.slug}/index.html`) !== route.page) fail(`${route.slug}/index.html did not map`);
  const prefixed = `/hyperscaler-energy-atlas/${route.slug}`;
  if (pageFromPath(prefixed) !== route.page) fail(`project path ${route.slug} did not map`);
  const href = `https://hypergrid.davidtphung.com/${route.slug}?kind=it_capacity`;
  const view = readUrl(href);
  if (view.page !== route.page) fail(`readUrl page ${route.slug}`);
  if (!view.filters.kinds.has("it_capacity")) fail(`readUrl dropped filters on ${route.slug}`);
  const written = writeUrl(view, { pathname: `/${route.slug}` });
  const again = readUrl(`https://hypergrid.davidtphung.com${written}`);
  if (again.page !== route.page || !again.filters.kinds.has("it_capacity")) fail(`round trip ${route.slug}`);
  const projectWritten = writeUrl(view, { pathname: prefixed });
  if (!projectWritten.startsWith(`/hyperscaler-energy-atlas/${route.page === "atlas" ? "atlas" : route.slug}`)) {
    fail(`project prefix dropped for ${route.slug}: ${projectWritten}`);
  }
}

if (pageFromPath("/") !== "atlas") fail("root is not atlas");
if (pathForPage("atlas", "/") !== "/") fail("atlas write left the root");
if (pathForPage("atlas", "/atlas") !== "/atlas") fail("atlas deep link was rewritten");
if (pathForPage("portfolio", "/atlas") !== "/analysis") fail("analysis path is wrong");

const donate = readUrl("https://hypergrid.davidtphung.com/#donate");
if (donate.page !== "about" || donate.anchor !== "donate") fail("donate hash missed");
const donateUrl = writeUrl(donate, { pathname: "/" });
if (donateUrl !== "/about#donate") fail(`donate canonical is ${donateUrl}`);

const rule = readUrl("https://hypergrid.davidtphung.com/about#what-counts");
if (rule.page !== "about" || rule.anchor !== "what-counts") fail("what-counts missed");

if (readUrl("https://hypergrid.davidtphung.com/no-such-tab").page !== "atlas") fail("unknown path did not fall back");

const vite = fs.readFileSync("vite.config.ts", "utf8");
if (!vite.includes("document.write") || !vite.includes("/hyperscaler-energy-atlas")) {
  fail("vite config is missing the base href script");
}
const emit = fs.readFileSync("scripts/emit-routes.ts", "utf8");
if (!emit.includes("404.html") || !emit.includes(".nojekyll") || !emit.includes("CNAME") || !emit.includes(".gitignore")) {
  fail("route emit does not keep the GitHub Pages files");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`routes ok (${TAB_ROUTES.length} tabs)`);
