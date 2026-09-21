import { useEffect, useState } from "react";

/**
 * Narrow viewports and landscape phones. Desktop (wide and tall) stays out.
 * Keep in sync with the matching @media block in index.css.
 */
export const PHONE_LAYOUT_QUERY =
  "(max-width: 820px), ((orientation: landscape) and (max-height: 520px) and (max-width: 1100px))";

/** Subscribe to a CSS media query, SSR-safe and reactive. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True when the user has requested reduced motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Track an element's size with ResizeObserver. */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [node, setNode] = useState<T | null>(null);

  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return { ref: setNode, ...size };
}
