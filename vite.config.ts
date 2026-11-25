import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const BASE_HREF_SCRIPT =
  `<base href="/"><script>(function(){var path=location.pathname;var marker="/hyperscaler-energy-atlas";if(path===marker||path.indexOf(marker+"/")===0){var base=document.querySelector("base");if(base)base.setAttribute("href",marker+"/");}})();</script>`;

function hypergridBaseHref(): Plugin {
  return {
    name: "hypergrid-base-href",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const without = html.split(BASE_HREF_SCRIPT).join("");
        const next = without.replace(/<head>/i, `<head>${BASE_HREF_SCRIPT}`);
        if (next === without) throw new Error("hypergrid base href: head tag missing");
        return next;
      },
    },
  };
}

// base: "./" keeps every asset reference relative so the build runs unchanged
// at a GitHub Pages project path (username.github.io/hyperscaler-energy-atlas/),
// a custom domain root, or local preview, with no per-host configuration.
export default defineConfig({
  base: "./",
  define: {
    __ATLAS_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react(), hypergridBaseHref()],
  build: {
    target: "es2020",
    cssTarget: "chrome90",
    chunkSizeWarningLimit: 1200,
  },
});
