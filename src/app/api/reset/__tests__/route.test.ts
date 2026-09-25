import { NextRequest } from "next/server";
import { POST } from "../route";
import { listItems, resetDemo } from "@/lib/store";

describe("POST /api/reset", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, CFC_DISABLE_API_AUTH: "true" };
    await resetDemo();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Authentication", () => {
    it("denies access (401) when CFC_API_TOKEN is set and auth token is missing or invalid", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.CFC_API_TOKEN = "test_secret_token";

      // Missing Authorization header
      const reqNoAuth = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });
      const resNoAuth = await POST(reqNoAuth);
      expect(resNoAuth.status).toBe(401);
      const bodyNoAuth = await resNoAuth.json();
      expect(bodyNoAuth.error).toMatch(/Missing or invalid API token/);

      // Invalid Authorization header
      const reqWrongAuth = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong_token",
        },
      });
      const resWrongAuth = await POST(reqWrongAuth);
      expect(resWrongAuth.status).toBe(401);
    });

    it("allows access when CFC_API_TOKEN is set and correct bearer token is provided", async () => {
      delete process.env.CFC_DISABLE_API_AUTH;
      process.env.CFC_API_TOKEN = "test_secret_token";

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer test_secret_token",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
    });
  });

  describe("Reset functionality", () => {
    it("successfully resets the demo and returns ok with item count", async () => {
      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ ok: true, items: 3 });
      expect(listItems().length).toBe(3);
    });

    it("re-seeds demo items correctly after state changes", async () => {
      // Confirm standard item count is 3
      expect(listItems().length).toBe(3);

      const req = new NextRequest("http://localhost:3000/api/reset", {
        method: "POST",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.items).toBe(listItems().length);
      expect(body.items).toBe(3);
    });
  });
});
