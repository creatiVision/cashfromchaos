import { NextRequest } from "next/server";
import {
  resolveTrustedOrigin,
  isValidHostFormat,
  parseHostInfo,
  isLocalhost,
  isBaseUrl,
  isAllowedHost,
  isTailscaleOrPrivate,
  extractSafeProtocol,
} from "../origin";

describe("isValidHostFormat", () => {
  it("should return true for valid standard and IPv6 hosts", () => {
    expect(isValidHostFormat("localhost")).toBe(true);
    expect(isValidHostFormat("localhost:3000")).toBe(true);
    expect(isValidHostFormat("example.com")).toBe(true);
    expect(isValidHostFormat("sub.example.com:8080")).toBe(true);
    expect(isValidHostFormat("[::1]")).toBe(true);
    expect(isValidHostFormat("[::1]:3000")).toBe(true);
    expect(isValidHostFormat("[2001:db8::1]:8080")).toBe(true);
  });

  it("should return false for invalid host formats", () => {
    expect(isValidHostFormat("user@host.com")).toBe(false);
    expect(isValidHostFormat("host.com/path")).toBe(false);
    expect(isValidHostFormat("host.com?query=1")).toBe(false);
    expect(isValidHostFormat("host.com#hash")).toBe(false);
    expect(isValidHostFormat("host.com\\bad")).toBe(false);
    expect(isValidHostFormat("")).toBe(false);
  });
});

describe("parseHostInfo", () => {
  it("should return parsed host info for valid raw host strings", () => {
    const info = parseHostInfo("example.com:8080");
    expect(info).toBeDefined();
    expect(info?.hostWithPort).toBe("example.com:8080");
    expect(info?.hostname).toBe("example.com");
    expect(info?.dummyUrl.href).toBe("http://example.com:8080/");
  });

  it("should return undefined when rawHost contains userinfo or non-root path", () => {
    expect(parseHostInfo("user:pass@example.com")).toBeUndefined();
    expect(parseHostInfo("example.com/api")).toBeUndefined();
  });

  it("should return undefined when new URL throws in catch block", () => {
    expect(parseHostInfo("[invalid-ipv6]")).toBeUndefined();
    expect(parseHostInfo("http://%80")).toBeUndefined();
  });
});

describe("isLocalhost", () => {
  it("should return true for local hostnames", () => {
    expect(isLocalhost("localhost")).toBe(true);
    expect(isLocalhost("127.0.0.1")).toBe(true);
    expect(isLocalhost("[::1]")).toBe(true);
  });

  it("should return false for non-local hostnames", () => {
    expect(isLocalhost("example.com")).toBe(false);
    expect(isLocalhost("192.168.1.1")).toBe(false);
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
    expect(isBaseUrl("example.com", "example.com", "http://%80")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "http://^invalid_host")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "://invalid-url")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "http://:80")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "http://[invalid]")).toBe(false);
    expect(isBaseUrl("example.com", "example.com", "http:// spaces ")).toBe(false);
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
    expect(isAllowedHost("example.com", "example.com", "http://[")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http://%80")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http://^invalid_host")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http://:80")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http://domain.com:abc")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http://[invalid]")).toBe(false);
    expect(isAllowedHost("example.com", "example.com", "http:// spaces ")).toBe(false);
    expect(
      isAllowedHost("app.example.com", "app.example.com", "http://[, app.example.com")
    ).toBe(true);
    expect(
      isAllowedHost("app.example.com", "app.example.com", "http://domain.com:abc, https://app.example.com")
    ).toBe(true);
    expect(
      isAllowedHost("app.example.com", "app.example.com", "http://%80, https://app.example.com")
    ).toBe(true);
  });

  it("should evict cache when allowedHostsCache reaches ALLOWED_HOSTS_CACHE_LIMIT", () => {
    // Fill cache up to limit (100 distinct envAllowed values)
    for (let i = 0; i < 105; i++) {
      expect(isAllowedHost("domain" + i + ".com", "domain" + i + ".com", "domain" + i + ".com")).toBe(true);
    }
  });
});

describe("isTailscaleOrPrivate", () => {
  it("should return false if baseUrlEnv is configured", () => {
    expect(isTailscaleOrPrivate("my-node.ts.net", "https://example.com")).toBe(false);
    expect(isTailscaleOrPrivate("10.0.0.1", "https://example.com")).toBe(false);
  });

  it("should return true for Tailscale domains and private IP ranges when baseUrlEnv is not set", () => {
    expect(isTailscaleOrPrivate("my-node.ts.net")).toBe(true);
    expect(isTailscaleOrPrivate("100.64.0.1")).toBe(true);
    expect(isTailscaleOrPrivate("10.1.2.3")).toBe(true);
    expect(isTailscaleOrPrivate("172.16.0.1")).toBe(true);
    expect(isTailscaleOrPrivate("192.168.1.100")).toBe(true);
  });

  it("should test boundaries for CGNAT (100.64.0.0/10) IP range", () => {
    expect(isTailscaleOrPrivate("100.63.255.255")).toBe(false);
    expect(isTailscaleOrPrivate("100.64.0.0")).toBe(true);
    expect(isTailscaleOrPrivate("100.127.255.255")).toBe(true);
    expect(isTailscaleOrPrivate("100.128.0.0")).toBe(false);
  });

  it("should test boundaries for 10.0.0.0/8 IP range", () => {
    expect(isTailscaleOrPrivate("9.255.255.255")).toBe(false);
    expect(isTailscaleOrPrivate("10.0.0.0")).toBe(true);
    expect(isTailscaleOrPrivate("10.255.255.255")).toBe(true);
    expect(isTailscaleOrPrivate("11.0.0.0")).toBe(false);
  });

  it("should test boundaries for 172.16.0.0/12 IP range", () => {
    expect(isTailscaleOrPrivate("172.15.255.255")).toBe(false);
    expect(isTailscaleOrPrivate("172.16.0.0")).toBe(true);
    expect(isTailscaleOrPrivate("172.31.255.255")).toBe(true);
    expect(isTailscaleOrPrivate("172.32.0.0")).toBe(false);
  });

  it("should test boundaries for 192.168.0.0/16 IP range", () => {
    expect(isTailscaleOrPrivate("192.167.255.255")).toBe(false);
    expect(isTailscaleOrPrivate("192.168.0.0")).toBe(true);
    expect(isTailscaleOrPrivate("192.168.255.255")).toBe(true);
    expect(isTailscaleOrPrivate("192.169.0.0")).toBe(false);
  });

  it("should return false for public hostnames/IPs when baseUrlEnv is not set", () => {
    expect(isTailscaleOrPrivate("public.com")).toBe(false);
    expect(isTailscaleOrPrivate("8.8.8.8")).toBe(false);
    expect(isTailscaleOrPrivate("172.32.0.1")).toBe(false);
  });

  it("should return false gracefully if parsing or regex operations throw an exception", () => {
    const throwingHost = {
      endsWith: () => {
        throw new Error("Simulated String parsing failure");
      },
    } as unknown as string;

    expect(isTailscaleOrPrivate(throwingHost)).toBe(false);
    expect(isTailscaleOrPrivate(null as unknown as string)).toBe(false);
    expect(isTailscaleOrPrivate(undefined as unknown as string)).toBe(false);
  });
});

describe("extractSafeProtocol", () => {
  it("should extract http or https from x-forwarded-proto header", () => {
    const reqHttp = new NextRequest("http://example.com", {
      headers: { "x-forwarded-proto": "http" },
    });
    expect(extractSafeProtocol(reqHttp)).toBe("http");

    const reqHttps = new NextRequest("http://example.com", {
      headers: { "x-forwarded-proto": "HTTPS" },
    });
    expect(extractSafeProtocol(reqHttps)).toBe("https");
  });

  it("should fallback to req.nextUrl protocol if header is absent", () => {
    const req = new NextRequest("https://example.com");
    expect(extractSafeProtocol(req)).toBe("https");
  });

  it("should default to https for unsupported protocols", () => {
    const req = new NextRequest("http://example.com", {
      headers: { "x-forwarded-proto": "ftp" },
    });
    expect(extractSafeProtocol(req)).toBe("https");
  });
});

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

  it("should return undefined if host format passes isValidHostFormat but fails parseHostInfo", () => {
    const req = {
      headers: new Map([["host", "localhost:65536"]]),
    } as unknown as NextRequest;
    expect(resolveTrustedOrigin(req)).toBeUndefined();
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
