import { NextRequest } from "next/server";
import { resolveTrustedOrigin, isBaseUrl, isAllowedHost } from "../origin";

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

  it("should reject userinfo injection in host header", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "evil.com@localhost:3000" },
    });
    expect(resolveTrustedOrigin(req)).toBeUndefined();
  });

  it("should reject path / query / fragment injection in host header", () => {
    const req1 = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000/evil" },
    });
    expect(resolveTrustedOrigin(req1)).toBeUndefined();

    const req2 = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000?evil=1" },
    });
    expect(resolveTrustedOrigin(req2)).toBeUndefined();

    const req3 = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000#evil" },
    });
    expect(resolveTrustedOrigin(req3)).toBeUndefined();
  });

  it("should reject backslash injection in host header", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000\\evil.com" },
    });
    expect(resolveTrustedOrigin(req)).toBeUndefined();
  });
});

describe("isBaseUrl", () => {
  it("should return false when baseUrlEnv is undefined or empty", () => {
    expect(isBaseUrl("example.com", "example.com")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "")).toBe(false);
  });

  it("should return true when hostWithPort matches parsed base URL host", () => {
    expect(
      isBaseUrl("example.com:8080", "example.com", "http://example.com:8080")
    ).toBe(true);
  });

  it("should return true when hostname matches parsed base URL hostname", () => {
    expect(
      isBaseUrl("example.com:3000", "example.com", "https://example.com:8080")
    ).toBe(true);
  });

  it("should automatically prepend http:// when protocol is omitted", () => {
    expect(isBaseUrl("example.com", "example.com", "example.com")).toBe(true);
  });

  it("should return false when neither hostWithPort nor hostname match", () => {
    expect(
      isBaseUrl("other.com", "other.com", "https://example.com")
    ).toBe(false);
  });

  it("should return false when baseUrlEnv is an invalid URL string (triggering catch block)", () => {
    expect(isBaseUrl("example.com", "example.com", "http://[")).toBe(false);
  });
});

describe("isAllowedHost", () => {
  it("should return false when envAllowed is undefined or empty", () => {
    expect(isAllowedHost("example.com", "example.com")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "")).toBe(false);
  });

  it("should return true when hostWithPort or hostname matches direct string entry in comma-separated list", () => {
    expect(
      isAllowedHost("app.example.com", "app.example.com", "other.com, app.example.com ")
    ).toBe(true);
    expect(
      isAllowedHost("app.example.com:3000", "app.example.com", "app.example.com")
    ).toBe(true);
  });

  it("should ignore empty entries and extra commas/whitespace in envAllowed", () => {
    expect(
      isAllowedHost("app.example.com", "app.example.com", " , , app.example.com , ")
    ).toBe(true);
  });

  it("should return true when entry with protocol matches hostWithPort or hostname", () => {
    expect(
      isAllowedHost("app.example.com:8080", "app.example.com", "https://app.example.com:8080")
    ).toBe(true);
    expect(
      isAllowedHost("app.example.com:3000", "app.example.com", "https://app.example.com:8080")
    ).toBe(true);
  });

  it("should return false when host does not match any allowed entry", () => {
    expect(
      isAllowedHost("evil.com", "evil.com", "app.example.com, https://allowed.com")
    ).toBe(false);
  });

  it("should safely handle invalid URL entries containing :// (triggering catch block) without throwing", () => {
    // Single invalid entry
    expect(isAllowedHost("example.com", "example.com", "http://[")).toBe(false);
    // Invalid entry followed by valid entry
    expect(
      isAllowedHost("app.example.com", "app.example.com", "http://[, app.example.com")
    ).toBe(true);
  });
});
