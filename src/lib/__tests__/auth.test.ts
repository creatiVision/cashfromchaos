import { NextRequest } from "next/server";
import { apiAuthConfigured, isApiAuthDisabled, checkApiAuth } from "../auth";

describe("auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CFC_API_TOKEN;
    delete process.env.CFC_DISABLE_API_AUTH;
    delete process.env.DISABLE_API_AUTH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isApiAuthDisabled & apiAuthConfigured", () => {
    it("returns disabled=false and configured=true by default", () => {
      expect(isApiAuthDisabled()).toBe(false);
      expect(apiAuthConfigured()).toBe(true);
    });

    it("returns disabled=true and configured=false when CFC_DISABLE_API_AUTH is true", () => {
      process.env.CFC_DISABLE_API_AUTH = "true";
      expect(isApiAuthDisabled()).toBe(true);
      expect(apiAuthConfigured()).toBe(false);
    });

    it("accepts 1 or yes to disable auth", () => {
      process.env.CFC_DISABLE_API_AUTH = "1";
      expect(isApiAuthDisabled()).toBe(true);

      process.env.DISABLE_API_AUTH = "yes";
      delete process.env.CFC_DISABLE_API_AUTH;
      expect(isApiAuthDisabled()).toBe(true);
    });
  });

  describe("checkApiAuth", () => {
    it("returns 401 by default when CFC_API_TOKEN is unset (fail-closed)", async () => {
      delete process.env.CFC_API_TOKEN;
      delete process.env.CFC_DISABLE_API_AUTH;

      const req = new NextRequest("http://localhost:3000/api/protected");
      const res = checkApiAuth(req);

      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);

      const data = await res?.json();
      expect(data).toEqual({
        error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'.",
      });
    });

    it("returns null when auth is explicitly disabled", () => {
      process.env.CFC_DISABLE_API_AUTH = "true";
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

    it("returns null when valid token is provided without Bearer prefix (raw token)", () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "test-token-123" },
      });
      expect(checkApiAuth(req)).toBeNull();
    });

    it("handles case-insensitive bearer prefix and whitespace", () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "BEARER   test-token-123  " },
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

    it("returns 401 when authorization header contains only Bearer prefix or whitespace", async () => {
      process.env.CFC_API_TOKEN = "test-token-123";
      const req = new NextRequest("http://localhost:3000/api/protected", {
        headers: { authorization: "Bearer   " },
      });
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
