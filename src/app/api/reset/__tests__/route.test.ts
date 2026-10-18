import { NextRequest } from "next/server";
import { POST } from "../route";
import { getItem, listItems, createItemFromIntake, resetDemo } from "@/lib/store";

describe("POST /api/reset", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, CFC_DISABLE_API_AUTH: "true" };
    delete process.env.CFC_API_TOKEN;
    delete process.env.DISABLE_API_AUTH;
    await resetDemo();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Authentication", () => {
    it("returns 401 Unauthorized when CFC_API_TOKEN is set and token is missing or invalid", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.CFC_API_TOKEN = "secret_reset_token";

      // Missing Authorization header
      const reqNoAuth = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const resNoAuth = await POST(reqNoAuth);
      expect(resNoAuth.status).toBe(401);
      const bodyNoAuth = await resNoAuth.json();
      expect(bodyNoAuth.error).toMatch(/Missing or invalid API token/);

      // Invalid Authorization header token
      const reqWrongAuth = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong_token",
        },
      });
      const resWrongAuth = await POST(reqWrongAuth);
      expect(resWrongAuth.status).toBe(401);
      const bodyWrongAuth = await resWrongAuth.json();
      expect(bodyWrongAuth.error).toMatch(/Missing or invalid API token/);
    });

    it("succeeds when CFC_API_TOKEN is set and valid Bearer token is provided", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.CFC_API_TOKEN = "secret_reset_token";

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer secret_reset_token",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
    });

    it("succeeds without Authorization header when auth is explicitly disabled via CFC_DISABLE_API_AUTH", async () => {
      process.env.CFC_DISABLE_API_AUTH = "true";
      process.env.CFC_API_TOKEN = "secret_reset_token";

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
    });

    it("succeeds without Authorization header when auth is explicitly disabled via DISABLE_API_AUTH", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.DISABLE_API_AUTH = "true";
      process.env.CFC_API_TOKEN = "secret_reset_token";

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
    });

    it("succeeds with case-insensitive Bearer token", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.CFC_API_TOKEN = "secret_reset_token";

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
        headers: {
          authorization: "bearer secret_reset_token",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
    });
  });

  describe("Functionality", () => {
    it("re-seeds demo items and returns count of reset items", async () => {
      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });

      const items = listItems();
      expect(items.length).toBe(3);
      const ids = items.map((i) => i.id);
      expect(ids).toContain("demo_pokemon");
      expect(ids).toContain("demo_pedal");
      expect(ids).toContain("demo_furniture");
    });

    it("resets modified items back to their initial state", async () => {
      // Modify an existing demo item's status
      const item = getItem("demo_pokemon");
      expect(item).toBeDefined();
      if (item) {
        item.status = "payout-released";
      }

      // Add a custom extra item to the store
      await createItemFromIntake({
        clue: "Custom Temporary Item",
        photos: ["/img/test.jpg"],
      });
      expect(listItems().length).toBe(4);

      // Trigger reset via POST /api/reset
      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });

      // Verify the store is restored to original 3 demo items
      expect(listItems().length).toBe(3);
      const restoredItem = getItem("demo_pokemon");
      expect(restoredItem).toBeDefined();
      expect(restoredItem?.status).toBe("buyer-engaged");

      const pedalItem = getItem("demo_pedal");
      expect(pedalItem?.status).toBe("listed");
    });

    it("handles multiple consecutive reset calls idempotently", async () => {
      const req1 = new NextRequest("http://localhost:3000/api/reset", { method: "POST" });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(await res1.json()).toEqual({ ok: true, items: 3 });

      const req2 = new NextRequest("http://localhost:3000/api/reset", { method: "POST" });
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      expect(await res2.json()).toEqual({ ok: true, items: 3 });

      expect(listItems().length).toBe(3);
    });

    it("ignores request body or query parameters and resets successfully", async () => {
      const req = new NextRequest("http://localhost:3000/api/reset?foo=bar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra: "data" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, items: 3 });
      expect(listItems().length).toBe(3);
    });
  });
});
