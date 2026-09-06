import { NextRequest } from "next/server";
import { apiAuthConfigured, checkApiAuth } from "../auth";

describe("auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("apiAuthConfigured", () => {
    it("returns false when CFC_API_TOKEN is not set", () => {
      delete process.env.CFC_API_TOKEN;
      expect(apiAuthConfigured()).toBe(false);
    });

    it("returns false when CFC_API_TOKEN is empty", () => {
      process.env.CFC_API_TOKEN = "";
      expect(apiAuthConfigured()).toBe(false);
    });

    it("returns true when CFC_API_TOKEN is set", () => {
      process.env.CFC_API_TOKEN = "my-secret-token";
      expect(apiAuthConfigured()).toBe(true);
    });
  });

  describe("checkApiAuth", () => {
    it("returns null when auth is not configured", () => {
      delete process.env.CFC_API_TOKEN;
      const req = new NextRequest("http://localhost:3000/api/protected");
      expect(checkApiAuth(req)).toBeNull();
    });

    it("returns null when valid token is provided with Bearer prefix", () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "Bearer test-token-123" },
      });
      expect(checkApiAuth(req)).toBeNull();
    });

    it("handles case-insensitive bearer prefix and whitespace", () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "bearer   test-token-123  " },
      });
      expect(checkApiAuth(req)).toBeNull();
    });

    it("returns 401 when authorization header is missing", async () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected");
      const res = checkApiAuth(req);

      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);

      const data = await res?.json();
      expect(data).toEqual({
        error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'.",
      });
    });

    it("returns 401 when invalid token is provided", async () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "Bearer wrong-token" },
      });
      const res = checkApiAuth(req);

      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);

      const data = await res?.json();
      expect(data).toEqual({
        error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'.",
      });
    });

    it("returns 401 when token of different length is provided", async () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: {
          authorization: "Bearer short",
        },
      });
      const res = checkApiAuth(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);

      const data = await res?.json();
      expect(data).toEqual({
        error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'.",
      });
    });
  });
});
