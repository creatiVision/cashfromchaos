import type { ListingDraft } from "@/lib/types";
import { ADAPTERS, adaptersByRegion, allAdapters, getAdapter } from "../registry";

describe("Marketplace Registry", () => {
  describe("ADAPTERS structure & integrity", () => {
    it("should have matching key and adapter id for every registered adapter", () => {
      Object.entries(ADAPTERS).forEach(([key, adapter]) => {
        expect(adapter.id).toBe(key);
      });
    });

    it("should have required properties with valid types on every adapter", () => {
      allAdapters().forEach((adapter) => {
        expect(typeof adapter.id).toBe("string");
        expect(adapter.id.length).toBeGreaterThan(0);
        expect(typeof adapter.name).toBe("string");
        expect(["shipping", "local", "collector", "generalist"]).toContain(adapter.kind);
        expect(typeof adapter.feePct).toBe("number");
        expect(adapter.feePct).toBeGreaterThanOrEqual(0);
        expect(typeof adapter.shippingFriendly).toBe("boolean");
        expect(["de", "eu", "global"]).toContain(adapter.region);
        expect(typeof adapter.blurb).toBe("string");
        expect(Array.isArray(adapter.strengths)).toBe(true);
        expect(typeof adapter.supportsCategory).toBe("function");
        expect(typeof adapter.createListing).toBe("function");
      });
    });
  });

  describe("allAdapters", () => {
    it("should return all marketplace adapters defined in ADAPTERS", () => {
      const adapters = allAdapters();
      const expectedAdapters = Object.values(ADAPTERS);
      expect(adapters).toEqual(expectedAdapters);
      expect(adapters.length).toBeGreaterThan(0);
    });
  });

  describe("getAdapter", () => {
    it("should return the adapter corresponding to a valid ID", () => {
      const adapter = getAdapter("ebay-de-mock");
      expect(adapter).toBeDefined();
      expect(adapter?.id).toBe("ebay-de-mock");
      expect(adapter?.name).toBe("eBay Germany (DE)");
    });

    it("should return undefined for an unknown adapter ID", () => {
      const adapter = getAdapter("non-existent-adapter");
      expect(adapter).toBeUndefined();
    });

    it("should return undefined for an empty string ID", () => {
      const adapter = getAdapter("");
      expect(adapter).toBeUndefined();
    });

    it("should return undefined for case mismatch in ID", () => {
      const adapter = getAdapter("EBAY-DE-MOCK");
      expect(adapter).toBeUndefined();
    });
  });

  describe("adaptersByRegion", () => {
    it("should return only adapters serving the 'de' region", () => {
      const deAdapters = adaptersByRegion("de");
      expect(deAdapters.length).toBeGreaterThan(0);
      deAdapters.forEach((adapter) => {
        expect(adapter.region).toBe("de");
      });
      // Specific check for expected DE adapters
      const ids = deAdapters.map((a) => a.id);
      expect(ids).toContain("ebay-de-mock");
      expect(ids).toContain("kleinanzeigen-mock");
    });

    it("should return only adapters serving the 'eu' region", () => {
      const euAdapters = adaptersByRegion("eu");
      expect(euAdapters.length).toBeGreaterThan(0);
      euAdapters.forEach((adapter) => {
        expect(adapter.region).toBe("eu");
      });
      const ids = euAdapters.map((a) => a.id);
      expect(ids).toContain("cashfromchaos-sandbox");
      expect(ids).toContain("collector-forum-mock");
      expect(ids).toContain("wallapop-mock");
      expect(ids).toContain("local-pickup-mock");
    });

    it("should return only adapters serving the 'global' region", () => {
      const globalAdapters = adaptersByRegion("global");
      expect(globalAdapters.length).toBeGreaterThan(0);
      globalAdapters.forEach((adapter) => {
        expect(adapter.region).toBe("global");
      });
      const ids = globalAdapters.map((a) => a.id);
      expect(ids).toContain("reverb-mock");
      expect(ids).toContain("ebay-mock");
      expect(ids).toContain("paypal-mock");
    });

    it("should return mutually exclusive lists for different regions", () => {
      const deIds = new Set(adaptersByRegion("de").map((a) => a.id));
      const euIds = new Set(adaptersByRegion("eu").map((a) => a.id));
      const globalIds = new Set(adaptersByRegion("global").map((a) => a.id));

      deIds.forEach((id) => {
        expect(euIds.has(id)).toBe(false);
        expect(globalIds.has(id)).toBe(false);
      });

      euIds.forEach((id) => {
        expect(deIds.has(id)).toBe(false);
        expect(globalIds.has(id)).toBe(false);
      });
    });

    it("should include all adapters when combining all region queries", () => {
      const deAdapters = adaptersByRegion("de");
      const euAdapters = adaptersByRegion("eu");
      const globalAdapters = adaptersByRegion("global");

      const totalByRegion = deAdapters.length + euAdapters.length + globalAdapters.length;
      expect(totalByRegion).toEqual(allAdapters().length);
    });
  });

  describe("supportsCategory", () => {
    it("should return true when category matches a strength case-insensitively", () => {
      const adapter = getAdapter("reverb-mock");
      expect(adapter).toBeDefined();

      expect(adapter!.supportsCategory("MUSIC")).toBe(true);
      expect(adapter!.supportsCategory("Guitar")).toBe(true);
      expect(adapter!.supportsCategory("AUDIO")).toBe(true);
    });

    it("should return true when input category string contains a strength substring", () => {
      const adapter = getAdapter("reverb-mock");
      expect(adapter).toBeDefined();

      // "vintage guitar gear" contains "guitar"
      expect(adapter!.supportsCategory("vintage guitar gear")).toBe(true);
    });

    it("should return true when strength string contains input category substring", () => {
      const adapter = getAdapter("collector-forum-mock");
      expect(adapter).toBeDefined();

      // strength "trading cards" contains category "cards"
      expect(adapter!.supportsCategory("cards")).toBe(true);
    });

    it("should return false when category does not match any strength", () => {
      const adapter = getAdapter("reverb-mock");
      expect(adapter).toBeDefined();

      expect(adapter!.supportsCategory("gardening")).toBe(false);
      expect(adapter!.supportsCategory("kitchenware")).toBe(false);
      expect(adapter!.supportsCategory("unrelated-category-xyz")).toBe(false);
    });
  });

  describe("createListing", () => {
    it("should create listing with a valid UUID externalId", async () => {
      const adapter = getAdapter("cashfromchaos-sandbox");
      expect(adapter).toBeDefined();

      const result = await adapter!.createListing({
        channelId: "cashfromchaos-sandbox",
        title: "Test Listing",
        body: "Test Description",
        tags: ["test"],
        price: 100,
        currency: "EUR",
      });

      expect(result.channelId).toBe("cashfromchaos-sandbox");
      expect(result.status).toBe("live");
      expect(result.url).toBe("/market/listing");

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const externalIdSuffix = result.externalId.replace("cashfromchaos-sandbox_", "");
      expect(externalIdSuffix).toMatch(uuidPattern);
    });

    it("should create listings for all adapters with their respective channelId", async () => {
      const draft: ListingDraft = {
        channelId: "generic",
        title: "Sample Item",
        body: "Item description",
        tags: ["electronics"],
        price: 50,
        currency: "EUR",
      };

      for (const adapter of allAdapters()) {
        const result = await adapter.createListing(draft);
        expect(result.channelId).toBe(adapter.id);
        expect(result.status).toBe("live");
        expect(result.url).toBe("/market/listing");
        expect(result.externalId.startsWith(`${adapter.id}_`)).toBe(true);
      }
    });
  });
});
