import type { ActorKind } from "../types";

/** Display order for filter groups. */
export const ACTOR_KIND_ORDER: ActorKind[] = [
  "Hyperscaler",
  "AI lab",
  "Neocloud",
  "Colocation/landlord",
  "Capital/JV",
  "China hyperscale",
  "Vendor/developer",
  "Undisclosed",
];

/**
 * Map an existing buyer display name to an actor kind.
 * Parenthetical display names (Orla load, Tract, PowerConneX) are listed in full
 * so they do not fall through to Undisclosed.
 */
const BUYER_KIND: Record<string, ActorKind> = {
  Meta: "Hyperscaler",
  "Meta (Orla LLC load)": "Hyperscaler",
  Google: "Hyperscaler",
  "Google / Alphabet": "Hyperscaler",
  Alphabet: "Hyperscaler",
  Amazon: "Hyperscaler",
  "Amazon / AWS": "Hyperscaler",
  AWS: "Hyperscaler",
  Microsoft: "Hyperscaler",
  Apple: "Hyperscaler",
  Oracle: "Hyperscaler",
  xAI: "AI lab",
  OpenAI: "AI lab",
  Anthropic: "AI lab",
  Fluidstack: "Neocloud",
  CoreWeave: "Neocloud",
  "Crusoe Energy": "Neocloud",
  Crusoe: "Neocloud",
  Nebius: "Neocloud",
  Lambda: "Neocloud",
  TensorWave: "Neocloud",
  EdgeConneX: "Colocation/landlord",
  "EdgeConneX (PowerConneX New Albany 2)": "Colocation/landlord",
  Fleet: "Colocation/landlord",
  "Fleet Data Centers (Tract Capital)": "Colocation/landlord",
  SoftBank: "Capital/JV",
  Brookfield: "Capital/JV",
  Alibaba: "China hyperscale",
  Tencent: "China hyperscale",
  Baidu: "China hyperscale",
  GDS: "China hyperscale",
  Chindata: "China hyperscale",
  "Holtec International": "Vendor/developer",
  "New Era Energy & Digital": "Vendor/developer",
  "Undisclosed hyperscaler": "Undisclosed",
  Unnamed: "Undisclosed",
};

/**
 * Buyer text that records a missing name. It stays on the row.
 * It is not an actor, so it is left out of actor chips and the actor count.
 */
export const UNLISTED_ACTOR_BUYERS = new Set(["Not named in the release"]);

export function listsAsActor(buyer: string): boolean {
  return !UNLISTED_ACTOR_BUYERS.has(buyer);
}

export function actorKindForBuyer(buyer: string): ActorKind {
  return BUYER_KIND[buyer] ?? "Undisclosed";
}

export function resolveActorKind(buyer: string, explicit?: ActorKind): ActorKind {
  return explicit ?? actorKindForBuyer(buyer);
}
