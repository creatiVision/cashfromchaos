import { NextRequest } from "next/server";
import { POST } from "../route";
import { ensureSeeded, getItem, resetDemo } from "@/lib/store";

describe("POST /api/fulfillment", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, CFC_DISABLE_API_AUTH: "true" };
    delete process.env.CFC_API_TOKEN;
    await resetDemo();
    await ensureSeeded();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createRequest(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost:3000/api/fulfillment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  describe("Authentication", () => {
    it("returns 401 Unauthorized when CFC_API_TOKEN is set and token is missing", async () => {
      process.env.CFC_DISABLE_API_AUTH = "false";
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = createRequest({ itemId: "demo_pokemon", action: "ship" });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Missing or invalid API token/);
    });

    it("succeeds when CFC_API_TOKEN is set and valid Bearer token is provided", async () => {
      process.env.CFC_DISABLE_API_AUTH = "false";
      process.env.CFC_API_TOKEN = "secret_token_123";

      const req = createRequest(
        { itemId: "demo_pokemon", action: "ship" },
        { Authorization: "Bearer secret_token_123" }
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.item).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    it("returns 400 Bad Request if JSON body is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON body");
    });

    it("returns 400 Bad Request when req.json() throws an error", async () => {
      const req = createRequest({});
      jest.spyOn(req, "json").mockRejectedValueOnce(new Error("Stream error"));
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON body");
    });

    it("returns 400 Bad Request when req.json() resolves to null or empty object", async () => {
      const reqNull = createRequest(null);
      const resNull = await POST(reqNull);
      expect(resNull.status).toBe(400);
      const jsonNull = await resNull.json();
      expect(jsonNull.error).toBe("Missing itemId or action");

      const reqEmpty = createRequest({});
      const resEmpty = await POST(reqEmpty);
      expect(resEmpty.status).toBe(400);
      const jsonEmpty = await resEmpty.json();
      expect(jsonEmpty.error).toBe("Missing itemId or action");
    });

    it("returns 400 Bad Request if itemId or action is missing", async () => {
      const req1 = createRequest({ itemId: "demo_pokemon" });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toBe("Missing itemId or action");

      const req2 = createRequest({ action: "ship" });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toBe("Missing itemId or action");
    });

    it("returns 400 Bad Request if itemId is not a string or exceeds length limit", async () => {
      const req1 = createRequest({ itemId: 12345, action: "ship" });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toBe("itemId must be a string of at most 100 characters");

      const longItemId = "a".repeat(101);
      const req2 = createRequest({ itemId: longItemId, action: "ship" });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toBe("itemId must be a string of at most 100 characters");
    });

    it("returns 400 Bad Request if action is not a string or exceeds length limit", async () => {
      const req1 = createRequest({ itemId: "demo_pokemon", action: { type: "ship" } });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toBe("action must be a string of at most 50 characters");

      const longAction = "a".repeat(51);
      const req2 = createRequest({ itemId: "demo_pokemon", action: longAction });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toBe("action must be a string of at most 50 characters");
    });
  });

  describe("Fulfillment Actions", () => {
    it("returns 404 Not Found if item does not exist", async () => {
      const req = createRequest({ itemId: "non_existent_item", action: "ship" });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Item not found");
    });

    it("returns 400 Bad Request for unknown action", async () => {
      const req = createRequest({ itemId: "demo_pokemon", action: "fly" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Unknown action");
    });

    it("successfully ships an item with 'ship' action", async () => {
      const req = createRequest({ itemId: "demo_pokemon", action: "ship" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.item.status).toBe("in-transit");
    });

    it("returns 409 Conflict for 'deliver' action when payment is not held", async () => {
      const item = getItem("demo_pokemon");
      if (item) {
        item.payment.status = "pending";
      }
      const req = createRequest({ itemId: "demo_pokemon", action: "deliver" });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Cannot release payout: payment is not held in custody yet.");
    });

    it("successfully confirms delivery and releases payout for 'deliver' action when payment is held", async () => {
      const item = getItem("demo_pokemon");
      if (item) {
        item.payment.status = "held";
      }
      const req = createRequest({ itemId: "demo_pokemon", action: "deliver" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.item.payment.status).toBe("released");
      expect(json.item.status).toBe("payout-released");
    });
  });
});
