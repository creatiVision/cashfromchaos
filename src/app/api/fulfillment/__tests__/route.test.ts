import { NextRequest } from "next/server";
import { POST } from "../route";

describe("POST /api/fulfillment auth", () => {
  const originalEnv = process.env.CFC_API_TOKEN;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CFC_API_TOKEN = originalEnv;
    } else {
      delete process.env.CFC_API_TOKEN;
    }
  });

  it("should return 401 when CFC_API_TOKEN is set and Authorization header is missing", async () => {
    process.env.CFC_API_TOKEN = "secret-token-123";

    const req = new NextRequest("http://localhost/api/fulfillment", {
      method: "POST",
      body: JSON.stringify({ itemId: "item-1", action: "ship" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Missing or invalid API token");
  });

  it("should return 401 when CFC_API_TOKEN is set and token is incorrect", async () => {
    process.env.CFC_API_TOKEN = "secret-token-123";

    const req = new NextRequest("http://localhost/api/fulfillment", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-token",
      },
      body: JSON.stringify({ itemId: "item-1", action: "ship" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should allow request when CFC_API_TOKEN is set and token is correct", async () => {
    process.env.CFC_API_TOKEN = "secret-token-123";

    const req = new NextRequest("http://localhost/api/fulfillment", {
      method: "POST",
      headers: {
        authorization: "Bearer secret-token-123",
      },
      body: JSON.stringify({ itemId: "non-existent-item", action: "ship" }),
    });

    const res = await POST(req);
    // Should pass auth check and proceed to item lookup (404 for non-existent item)
    expect(res.status).toBe(404);
  });
});
