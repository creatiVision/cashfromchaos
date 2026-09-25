import { NextRequest } from "next/server";
import { POST } from "../route";
import { ensureSeeded, getItem, resetDemo } from "@/lib/store";

describe("POST /api/checkout", () => {
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
    return new NextRequest("http://localhost:3000/api/checkout", {
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
      const req = createRequest({ itemId: "demo_pokemon" });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Missing or invalid API token/);
    });

    it("succeeds when CFC_API_TOKEN is set and valid Bearer token is provided", async () => {
      process.env.CFC_DISABLE_API_AUTH = "false";
      process.env.CFC_API_TOKEN = "secret_token_123";

      // Set item payment amount > 0
      const item = getItem("demo_pokemon");
      if (item) {
        item.payment.amount = 50;
      }

      const req = createRequest(
        { itemId: "demo_pokemon" },
        { Authorization: "Bearer secret_token_123" }
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    it("returns 400 Bad Request if JSON body is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON body");
    });

    it("returns 400 Bad Request if itemId is missing", async () => {
      const req = createRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Missing itemId");
    });

    it("returns 400 Bad Request if itemId is not a string (number)", async () => {
      const req = createRequest({ itemId: 12345 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("itemId must be a string of at most 100 characters");
    });

    it("returns 400 Bad Request if itemId is not a string (boolean)", async () => {
      const req = createRequest({ itemId: true });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("itemId must be a string of at most 100 characters");
    });

    it("returns 400 Bad Request if itemId is not a string (object)", async () => {
      const req = createRequest({ itemId: { id: "demo_pokemon" } });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("itemId must be a string of at most 100 characters");
    });

    it("returns 400 Bad Request if itemId exceeds length limit (101 characters)", async () => {
      const longItemId = "a".repeat(101);
      const req = createRequest({ itemId: longItemId });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("itemId must be a string of at most 100 characters");
    });
  });

  describe("Checkout Logic", () => {
    it("returns 404 Not Found if item does not exist", async () => {
      const req = createRequest({ itemId: "non_existent_item" });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Item not found");
    });

    it("returns 400 Bad Request if item payment amount is <= 0", async () => {
      const item = getItem("demo_pokemon");
      if (item) {
        item.payment.amount = 0;
      }
      const req = createRequest({ itemId: "demo_pokemon" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("No agreed price yet");
    });

    it("returns 200 OK with checkout URL when request is valid and price > 0", async () => {
      const item = getItem("demo_pokemon");
      if (item) {
        item.payment.amount = 45;
      }
      const req = createRequest({ itemId: "demo_pokemon" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("url");
      expect(json).toHaveProperty("provider");
      expect(typeof json.url).toBe("string");
    });
  });
});
