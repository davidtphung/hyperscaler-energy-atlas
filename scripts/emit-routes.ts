import fs from "node:fs";
import path from "node:path";
import { TAB_ROUTES } from "../src/lib/routes.ts";

const dist = path.resolve("dist");
const indexPath = path.join(dist, "index.html");
const index = fs.readFileSync(indexPath, "utf8");
if (!index.includes('<base href="/">') || !index.includes("/hyperscaler-energy-atlas")) {
  console.error("built index.html is missing the base href script");
  process.exit(1);
}
const cnamePath = path.join(dist, "CNAME");
if (!fs.existsSync(cnamePath)) {
  console.error("dist/CNAME is missing");
  process.exit(1);
}
const cname = fs.readFileSync(cnamePath, "utf8").trim();
if (cname !== "hypergrid.davidtphung.com") {
  console.error(`dist/CNAME is ${cname}`);
  process.exit(1);
}
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
if (!fs.existsSync(path.resolve(".gitignore"))) {
  console.error("repo .gitignore is missing");
  process.exit(1);
}
fs.copyFileSync(path.resolve(".gitignore"), path.join(dist, ".gitignore"));
fs.writeFileSync(path.join(dist, "404.html"), index);
for (const route of TAB_ROUTES) {
  const dir = path.join(dist, route.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), index);
}
console.log(`emitted 404.html and ${TAB_ROUTES.length} route indexes`);
