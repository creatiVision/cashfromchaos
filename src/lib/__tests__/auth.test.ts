import { NextRequest } from "next/server";
import { apiAuthConfigured, checkApiAuth } from "../auth";

describe("auth module", () => {
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

    it("returns true when CFC_API_TOKEN is set", () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      expect(apiAuthConfigured()).toBe(true);
    });
  });

  describe("checkApiAuth", () => {
    it("returns null when CFC_API_TOKEN is not configured", () => {
      delete process.env.CFC_API_TOKEN;
      const req = new NextRequest("http://localhost/api/test", {
        headers: {},
      });
      expect(checkApiAuth(req)).toBeNull();
    });

    it("returns null when valid Bearer token is provided", () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          authorization: "Bearer secret_token_123",
        },
      });
      expect(checkApiAuth(req)).toBeNull();
    });

    it("returns 401 when Authorization header is missing", async () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost/api/test", {
        headers: {},
      });
      const res = checkApiAuth(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
      const json = await res?.json();
      expect(json.error).toContain("Missing or invalid API token");
    });

    it("returns 401 when invalid token is provided", async () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          authorization: "Bearer wrong_token_456",
        },
      });
      const res = checkApiAuth(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
    });

    it("returns 401 when token of different length is provided", async () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          authorization: "Bearer short",
        },
      });
      const res = checkApiAuth(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
    });

    it("handles case-insensitive Bearer prefix and whitespace", () => {
      process.env.CFC_API_TOKEN = "secret_token_123";
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          authorization: "bearer   secret_token_123  ",
        },
      });
      expect(checkApiAuth(req)).toBeNull();
    });
  });
});
