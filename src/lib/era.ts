import type { Era } from "../types";

// Era boundaries are anchored to the generative-AI inflection. ChatGPT launched
// in late November 2022, so commitments before that sit in the pre-AI baseline.
// "forecast" covers announcements dated in the future relative to load time.
const ONSET = Date.UTC(2022, 10, 1); // 2022-11
const ACCEL = Date.UTC(2024, 0, 1); // 2024-01
const CURRENT = Date.UTC(2026, 0, 1); // 2026-01
const NOW = Date.now();

export function classifyEra(t: number): Era {
  if (t > NOW) return "forecast";
  if (t < ONSET) return "pre-ai";
  if (t < ACCEL) return "ai-onset";
  if (t < CURRENT) return "acceleration";
  return "current";
}

export const ERA: Record<Era, { label: string; short: string; color: string; blurb: string }> = {
  "pre-ai": {
    label: "Pre-AI baseline",
    short: "Pre-AI",
    color: "#6b7480",
    blurb: "Before late 2022. Mostly renewable matching and efficiency, set against ordinary load growth.",
  },
  "ai-onset": {
    label: "AI boom onset",
    short: "Onset",
    color: "#5aa9e6",
    blurb: "Late 2022 through 2023. The first fusion and geothermal bets as model training scales.",
  },
  acceleration: {
    label: "Post-AI acceleration",
    short: "Acceleration",
    color: "#a78bfa",
    blurb: "2024 and 2025. Nuclear restarts, SMRs, and gigawatt campuses arrive in force.",
  },
  current: {
    label: "Current commitments",
    short: "Current",
    color: "#c8f135",
    blurb: "2026 to date. Firming up power with gas, fuel cells, and continued nuclear.",
  },
  forecast: {
    label: "Forecast and targets",
    short: "Forecast",
    color: "#f2a93b",
    blurb: "Dated ahead of today. Targets and signaled intent not yet contracted.",
  },
};

export const ERA_ORDER: Era[] = ["pre-ai", "ai-onset", "acceleration", "current", "forecast"];
