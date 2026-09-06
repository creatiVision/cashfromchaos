import { NextRequest } from "next/server";
import { resolveTrustedOrigin } from "../origin";

describe("resolveTrustedOrigin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should allow localhost", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000" },
    });
    expect(resolveTrustedOrigin(req)).toBe("http://localhost:3000");
  });

  it("should allow 127.0.0.1", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(resolveTrustedOrigin(req)).toBe("http://127.0.0.1:3000");
  });

  it("should allow Tailscale .ts.net hosts", () => {
    const req = new NextRequest("https://my-node.ts.net/api/checkout", {
      headers: { host: "my-node.ts.net", "x-forwarded-proto": "https" },
    });
    expect(resolveTrustedOrigin(req)).toBe("https://my-node.ts.net");
  });

  it("should allow configured NEXT_PUBLIC_BASE_URL", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://marketplace.example.com";
    const req = new NextRequest("https://marketplace.example.com/api/checkout", {
      headers: { host: "marketplace.example.com", "x-forwarded-proto": "https" },
    });
    expect(resolveTrustedOrigin(req)).toBe("https://marketplace.example.com");
  });

  it("should reject malicious host header injection attempts", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://marketplace.example.com";
    const req = new NextRequest("https://marketplace.example.com/api/checkout", {
      headers: { host: "evil-attacker.com" },
    });
    expect(resolveTrustedOrigin(req)).toBeUndefined();
  });

  it("should reject host bypass tricks like attacker.com?.ts.net", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "attacker.com?.ts.net" },
    });
    expect(resolveTrustedOrigin(req)).toBeUndefined();
  });
});
