import { NextRequest } from "next/server";
import { getSafeOrigin } from "./route";

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
