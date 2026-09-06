import { ADAPTERS, adaptersByRegion, allAdapters, getAdapter } from "../registry";

describe("Marketplace Registry", () => {
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
  });
});
