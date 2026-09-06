import { ADAPTERS, adaptersByRegion, allAdapters, getAdapter } from "../registry";
import type { ListingDraft } from "@/lib/types";

describe("Marketplace Registry", () => {
  describe("ADAPTERS dictionary integrity", () => {
    it("should have matching dictionary keys and adapter IDs", () => {
      Object.entries(ADAPTERS).forEach(([key, adapter]) => {
        expect(adapter.id).toBe(key);
      });
    });

    it("should have valid metadata fields for all registered adapters", () => {
      const validKinds = ["shipping", "local", "collector", "generalist"];
      const validRegions = ["de", "eu", "global"];

      Object.values(ADAPTERS).forEach((adapter) => {
        expect(typeof adapter.id).toBe("string");
        expect(adapter.id.length).toBeGreaterThan(0);

        expect(typeof adapter.name).toBe("string");
        expect(adapter.name.length).toBeGreaterThan(0);

        expect(validKinds).toContain(adapter.kind);

        expect(typeof adapter.feePct).toBe("number");
        expect(adapter.feePct).toBeGreaterThanOrEqual(0);

        expect(typeof adapter.shippingFriendly).toBe("boolean");

        expect(validRegions).toContain(adapter.region);

        expect(typeof adapter.blurb).toBe("string");
        expect(adapter.blurb.length).toBeGreaterThan(0);

        expect(Array.isArray(adapter.strengths)).toBe(true);
        expect(adapter.strengths.length).toBeGreaterThan(0);
        adapter.strengths.forEach((strength) => {
          expect(typeof strength).toBe("string");
        });
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

    it("should return undefined for empty string ID", () => {
      const adapter = getAdapter("");
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
    it("should return true when category matches adapter strengths (case-insensitive)", () => {
      const reverb = getAdapter("reverb-mock")!;
      expect(reverb.supportsCategory("GUITAR")).toBe(true);
      expect(reverb.supportsCategory("guitar")).toBe(true);
      expect(reverb.supportsCategory("Music Gear")).toBe(true);
    });

    it("should handle partial string matches in both directions", () => {
      const collector = getAdapter("collector-forum-mock")!;
      // category contains strength ("trading cards" in "rare trading cards collection")
      expect(collector.supportsCategory("rare trading cards collection")).toBe(true);
      // strength contains category ("pokemon" contains "pokem")
      expect(collector.supportsCategory("pokemon")).toBe(true);
    });

    it("should return false when category is not supported", () => {
      const collector = getAdapter("collector-forum-mock")!;
      expect(collector.supportsCategory("heavy machinery")).toBe(false);
      expect(collector.supportsCategory("kitchen appliances")).toBe(false);
    });

    it("should match any category for sandbox adapter due to empty string strength", () => {
      const sandbox = getAdapter("cashfromchaos-sandbox")!;
      expect(sandbox.supportsCategory("anything")).toBe(true);
      expect(sandbox.supportsCategory("unusual-category-xyz")).toBe(true);
    });
  });

  describe("createListing", () => {
    it("should create listing with valid format and UUID externalId", async () => {
      const adapter = getAdapter("cashfromchaos-sandbox")!;

      const result = await adapter.createListing({
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

    it("should generate unique external IDs for successive listings on different adapters", async () => {
      const ebayDe = getAdapter("ebay-de-mock")!;
      const kleinanzeigen = getAdapter("kleinanzeigen-mock")!;

      const draft: ListingDraft = {
        channelId: "ebay-de-mock",
        title: "Vintage Guitar",
        body: "Great condition",
        tags: ["guitar"],
        price: 250,
        currency: "EUR",
      };

      const result1 = await ebayDe.createListing(draft);
      const result2 = await ebayDe.createListing(draft);
      const result3 = await kleinanzeigen.createListing({ ...draft, channelId: "kleinanzeigen-mock" });

      expect(result1.externalId).not.toEqual(result2.externalId);
      expect(result1.channelId).toBe("ebay-de-mock");
      expect(result1.externalId.startsWith("ebay-de-mock_")).toBe(true);

      expect(result3.channelId).toBe("kleinanzeigen-mock");
      expect(result3.externalId.startsWith("kleinanzeigen-mock_")).toBe(true);
    });
  });
});
