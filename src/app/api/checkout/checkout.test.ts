import { NextRequest } from "next/server";
import { getSafeOrigin } from "@/lib/origin";
import { POST } from "./route";
import { getItem, resetDemo, ensureSeeded } from "@/lib/store";

describe("Host Header Injection Prevention (getSafeOrigin)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should reject malicious host headers when NEXT_PUBLIC_BASE_URL is set", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://checkout.example.com";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const req = new NextRequest("https://checkout.example.com/api/checkout", {
      headers: {
        host: "evil-attacker.com",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBeUndefined();
  });

  it("should reject arbitrary .ts.net hosts if not explicitly in ALLOWED_HOSTS", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://app.example.com";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const req = new NextRequest("https://app.example.com/api/checkout", {
      headers: {
        host: "malicious-user.ts.net",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBeUndefined();
  });

  it("should accept host header matching NEXT_PUBLIC_BASE_URL", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://app.example.com";

    const req = new NextRequest("https://app.example.com/api/checkout", {
      headers: {
        host: "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBe("https://app.example.com");
  });

  it("should accept host matching ALLOWED_HOSTS env configuration", () => {
    process.env.ALLOWED_HOSTS = "my-trusted-node.ts.net, localhost:3000";

    const req = new NextRequest("http://my-trusted-node.ts.net/api/checkout", {
      headers: {
        host: "my-trusted-node.ts.net",
        "x-forwarded-proto": "https",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBe("https://my-trusted-node.ts.net");
  });

  it("should allow localhost in development environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-proto": "http",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBe("http://localhost:3000");
  });

  it("should sanitize invalid x-forwarded-proto schemes", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://app.example.com";

    const req = new NextRequest("https://app.example.com/api/checkout", {
      headers: {
        host: "app.example.com",
        "x-forwarded-proto": "javascript:alert(1)",
      },
    });

    const origin = getSafeOrigin(req);
    expect(origin).toBe("https://app.example.com");
  });
});

describe("POST /api/checkout", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, CFC_DISABLE_API_AUTH: "true" };
    delete process.env.CFC_API_TOKEN;
    delete process.env.STRIPE_SECRET_KEY;
    await resetDemo();
    await ensureSeeded();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 Unauthorized if API auth token is configured and missing/invalid", async () => {
    delete process.env.CFC_DISABLE_API_AUTH;
    process.env.CFC_API_TOKEN = "secret_api_token";

    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Missing or invalid API token");
  });

  it("returns 400 Bad Request if JSON body is invalid", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: "{ invalid json",
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 Bad Request if itemId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Missing itemId" });
  });

  it("returns 400 Bad Request if itemId is not a string", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: 12345 }),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId must be a string");
  });

  it("returns 400 Bad Request if itemId exceeds max length", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: "a".repeat(101) }),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId must be a string of at most 100 characters");
  });

  it("returns 404 Not Found if item does not exist", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: "non_existent_item" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Item not found" });
  });

  it("returns 400 Bad Request if item has no agreed price (amount <= 0)", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No agreed price yet" });
  });

  it("creates checkout, updates item payment status, and returns checkout url for items with agreed price", async () => {
    const item = getItem("demo_pokemon");
    expect(item).toBeDefined();
    if (item) {
      item.payment.amount = 45;
    }

    const req = new NextRequest("http://localhost:3000/api/checkout", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pokemon" }),
      headers: {
        "content-type": "application/json",
        host: "localhost:3000",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      url: "http://localhost:3000/api/checkout/confirm?item=demo_pokemon&session=sim_demo_pokemon&sim=1",
      provider: "simulated",
    });

    const updatedItem = getItem("demo_pokemon");
    expect(updatedItem?.payment.status).toBe("pending");
    expect(updatedItem?.payment.provider).toBe("simulated");
    expect(updatedItem?.payment.sessionId).toBe("sim_demo_pokemon");
    expect(updatedItem?.payment.checkoutUrl).toBe(body.url);
    expect(updatedItem?.trace.some((t) => t.label.includes("Checkout created"))).toBe(true);
  });
});
