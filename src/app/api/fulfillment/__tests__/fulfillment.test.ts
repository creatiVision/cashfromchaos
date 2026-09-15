import { NextRequest } from "next/server";
import { POST } from "../route";
import { getItem, resetDemo, ensureSeeded } from "@/lib/store";

describe("POST /api/fulfillment", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CFC_API_TOKEN;
    await resetDemo();
    await ensureSeeded();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("denies access when CFC_API_TOKEN is set and request token is missing or invalid", async () => {
    process.env.CFC_API_TOKEN = "secret-token";
    const req = new NextRequest("http://localhost:3000/api/fulfillment", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon", action: "ship" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("allows access when CFC_API_TOKEN is set and correct authorization header is provided", async () => {
    process.env.CFC_API_TOKEN = "secret-token";
    const req = new NextRequest("http://localhost:3000/api/fulfillment", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon", action: "ship" }),
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer secret-token",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 404 when item does not exist", async () => {
    const req = new NextRequest("http://localhost:3000/api/fulfillment", {
      method: "POST",
      body: JSON.stringify({ itemId: "non_existent_item", action: "ship" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Item not found" });
  });

  it("returns 400 when action is unknown", async () => {
    const req = new NextRequest("http://localhost:3000/api/fulfillment", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon", action: "invalid_action" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Unknown action" });
  });

  describe("action: ship", () => {
    it("updates item status to in-transit and records trace log", async () => {
      const itemId = "demo_pokemon";
      const req = new NextRequest("http://localhost:3000/api/fulfillment", {
        method: "POST",
        body: JSON.stringify({ itemId, action: "ship" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.item).toBeDefined();
      expect(body.item.status).toBe("in-transit");

      const itemInStore = getItem(itemId);
      expect(itemInStore?.status).toBe("in-transit");
      expect(
        itemInStore?.trace.some(
          (t) => t.actor === "seller" && t.label === "Package dropped at carrier"
        )
      ).toBe(true);
    });
  });

  describe("action: deliver", () => {
    it("returns 409 conflict if payment status is not held", async () => {
      const itemId = "demo_pokemon";
      const item = getItem(itemId);
      if (item) {
        item.payment.status = "none";
      }

      const req = new NextRequest("http://localhost:3000/api/fulfillment", {
        method: "POST",
        body: JSON.stringify({ itemId, action: "deliver" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body).toEqual({
        error: "Cannot release payout: payment is not held in custody yet.",
      });
    });

    it("updates status, releases payment, adds ledger entry, and traces logs when payment is held", async () => {
      const itemId = "demo_pokemon";
      const item = getItem(itemId);
      if (!item) throw new Error("Expected item demo_pokemon to exist");

      // Set payment status to held as if payment occurred
      item.payment.status = "held";
      item.payment.amount = 120;

      const initialLedgerLength = item.ledger.length;

      const req = new NextRequest("http://localhost:3000/api/fulfillment", {
        method: "POST",
        body: JSON.stringify({ itemId, action: "deliver" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.item).toBeDefined();
      expect(body.item.status).toBe("payout-released");
      expect(body.item.payment.status).toBe("released");

      const itemInStore = getItem(itemId);
      expect(itemInStore?.status).toBe("payout-released");
      expect(itemInStore?.payment.status).toBe("released");
      expect(itemInStore?.ledger.length).toBe(initialLedgerLength + 1);
      expect(itemInStore?.ledger[itemInStore.ledger.length - 1]).toEqual({
        label: "Payout released to seller",
        amount: 0,
        kind: "payout",
      });

      expect(
        itemInStore?.trace.some(
          (t) => t.actor === "buyer" && t.label === "Delivery confirmed"
        )
      ).toBe(true);
      expect(
        itemInStore?.trace.some(
          (t) => t.actor === "stripe" && t.label === "Funds released to seller"
        )
      ).toBe(true);
      expect(
        itemInStore?.trace.some(
          (t) => t.actor === "system" && t.label === "Transaction complete"
        )
      ).toBe(true);
    });
  });
});
