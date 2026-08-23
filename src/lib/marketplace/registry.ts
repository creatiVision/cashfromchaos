// ============================================================================
// Marketplace registry — adapters as interfaces with mock implementations.
// The operator is marketplace-agnostic; it routes by item, not by default.
// Real adapters (Wallapop/eBay/Cardmarket) can be added behind this interface
// later without touching the UI or the operator brain.
// ============================================================================

import type { ListingDraft } from "@/lib/types";

export interface ListingResult {
  channelId: string;
  externalId: string;
  url: string;
  status: "live" | "pending" | "rejected";
}

export interface MarketplaceAdapter {
  id: string;
  name: string;
  kind: "shipping" | "local" | "collector" | "generalist";
  feePct: number;
  shippingFriendly: boolean;
  /** Market region this channel serves — used for DE/DACH routing preference. */
  region: "de" | "eu" | "global";
  blurb: string;
  /** Category keywords this channel is strong for. */
  strengths: string[];
  supportsCategory(category: string): boolean;
  createListing(draft: ListingDraft): Promise<ListingResult>;
}

function mockAdapter(
  cfg: Omit<MarketplaceAdapter, "supportsCategory" | "createListing">
): MarketplaceAdapter {
  return {
    ...cfg,
    supportsCategory(category: string) {
      const c = category.toLowerCase();
      return cfg.strengths.some((s) => c.includes(s) || s.includes(c));
    },
    async createListing(draft: ListingDraft): Promise<ListingResult> {
      // Mock: pretend we posted. Real adapter would call the channel API.
      return {
        channelId: cfg.id,
        externalId: `${cfg.id}_${Math.random().toString(36).slice(2, 9)}`,
        url: `/market/listing`,
        status: "live",
      };
    },
  };
}

export const ADAPTERS: Record<string, MarketplaceAdapter> = {
  "cashfromchaos-sandbox": mockAdapter({
    id: "cashfromchaos-sandbox",
    name: "CashFromChaos Sandbox",
    kind: "generalist",
    feePct: 0,
    shippingFriendly: true,
    region: "eu",
    blurb: "Internal demo marketplace where the fake buyer browses and pays.",
    strengths: ["", "general", "electronics", "music", "collectibles", "furniture", "kids"],
  }),
  "collector-forum-mock": mockAdapter({
    id: "collector-forum-mock",
    name: "Cardmarket-style Collector Channel",
    kind: "collector",
    feePct: 5,
    shippingFriendly: true,
    region: "eu",
    blurb: "Specialist collector demand for trading cards & collectibles.",
    strengths: ["collectibles", "trading cards", "pokemon", "tcg", "cards"],
  }),
  "reverb-mock": mockAdapter({
    id: "reverb-mock",
    name: "Reverb-style Music Gear Channel",
    kind: "shipping",
    feePct: 5,
    shippingFriendly: true,
    region: "global",
    blurb: "Buyers specifically hunting instruments & music electronics.",
    strengths: ["music", "instrument", "guitar", "pedal", "audio", "electronics"],
  }),
  "wallapop-mock": mockAdapter({
    id: "wallapop-mock",
    name: "Wallapop-style Generalist (mock)",
    kind: "generalist",
    feePct: 0,
    shippingFriendly: true,
    region: "eu",
    blurb: "Broad local + shipping marketplace. Good generalist fallback.",
    strengths: ["electronics", "general", "music", "kids", "home"],
  }),
  "ebay-mock": mockAdapter({
    id: "ebay-mock",
    name: "eBay-style Global (mock)",
    kind: "shipping",
    feePct: 11,
    shippingFriendly: true,
    region: "global",
    blurb: "Global reach fallback for rare or niche items.",
    strengths: ["electronics", "collectibles", "music", "rare"],
  }),
  "ebay-de-mock": mockAdapter({
    id: "ebay-de-mock",
    name: "eBay Kleinanzeigen (mock)",
    kind: "shipping",
    feePct: 11,
    shippingFriendly: true,
    blurb: "German eBay equivalent for local and shipped items.",
    strengths: ["electronics", "collectibles", "music", "rare", "german", "germany"],
  }),
  "local-pickup-mock": mockAdapter({
    id: "local-pickup-mock",
    name: "Local Pickup Channel (mock)",
    kind: "local",
    feePct: 0,
    shippingFriendly: false,
    region: "eu",
    blurb: "Bulky items, local pickup only. No stupid shipping spend.",
    strengths: ["furniture", "home", "bulky", "appliance"],
  }),
  "ebay-de-mock": mockAdapter({
    id: "ebay-de-mock",
    name: "eBay Germany (DE)",
    kind: "shipping",
    feePct: 10,
    shippingFriendly: true,
    region: "de",
    blurb: "German eBay marketplace - strong for electronics, collectibles, and music gear in the DACH region.",
    strengths: ["electronics", "german", "dach", "eu", "collectibles", "music", "guitar", "pedal", "instrument"],
  }),
  "paypal-mock": mockAdapter({
    id: "paypal-mock",
    name: "PayPal Marketplace",
    kind: "generalist",
    feePct: 3,
    shippingFriendly: true,
    region: "global",
    blurb: "PayPal's commerce platform - good for electronics and general merchandise with seamless payment processing.",
    strengths: ["electronics", "general", "clothing", "home", "automotive"],
  }),
  "kleinanzeigen-mock": mockAdapter({
    id: "kleinanzeigen-mock",
    name: "Kleinanzeigen.de (mock)",
    kind: "generalist",
    feePct: 0,
    shippingFriendly: true,
    region: "de",
    blurb: "Germany's leading C2C classifieds platform - strong local demand plus optional shipping.",
    strengths: ["general", "electronics", "furniture", "kids", "home", "fashion", "bulky"],
  }),
};

export function getAdapter(id: string): MarketplaceAdapter | undefined {
  return ADAPTERS[id];
}

export function allAdapters(): MarketplaceAdapter[] {
  return Object.values(ADAPTERS);
}

/** Adapters serving exactly the given market region. */
export function adaptersByRegion(region: "de" | "eu" | "global"): MarketplaceAdapter[] {
  return allAdapters().filter((a) => a.region === region);
}
