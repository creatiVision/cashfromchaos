import { NextRequest } from "next/server";
import { getTrustedOrigin } from "@/lib/origin";

describe("getTrustedOrigin security checks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should allow valid localhost hosts", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "localhost:3000" },
    });
    expect(getTrustedOrigin(req)).toBe("http://localhost:3000");
  });

  it("should allow valid 127.0.0.1 IP host", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(getTrustedOrigin(req)).toBe("http://127.0.0.1:3000");
  });

  it("should allow valid Tailscale domain host (*.ts.net)", () => {
    const req = new NextRequest("http://my-node.ts.net:3000/api/checkout", {
      headers: { host: "my-node.ts.net:3000" },
    });
    expect(getTrustedOrigin(req)).toBe("http://my-node.ts.net:3000");
  });

  it("should allow valid Tailscale CGNAT IP (100.64.0.1 - 100.127.255.255)", () => {
    const req = new NextRequest("http://100.115.12.3:3000/api/checkout", {
      headers: { host: "100.115.12.3:3000" },
    });
    expect(getTrustedOrigin(req)).toBe("http://100.115.12.3:3000");
  });

  it("should allow private LAN IP addresses", () => {
    const req1 = new NextRequest("http://192.168.1.100:3000/api/checkout", {
      headers: { host: "192.168.1.100:3000" },
    });
    expect(getTrustedOrigin(req1)).toBe("http://192.168.1.100:3000");

    const req2 = new NextRequest("http://10.0.0.5:3000/api/checkout", {
      headers: { host: "10.0.0.5:3000" },
    });
    expect(getTrustedOrigin(req2)).toBe("http://10.0.0.5:3000");
  });

  it("should allow host matching NEXT_PUBLIC_BASE_URL", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://checkout.mycompany.com";
    const req = new NextRequest("https://checkout.mycompany.com/api/checkout", {
      headers: { host: "checkout.mycompany.com" },
    });
    expect(getTrustedOrigin(req)).toBe("https://checkout.mycompany.com");
  });

  it("should respect x-forwarded-proto if https", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-proto": "https",
      },
    });
    expect(getTrustedOrigin(req)).toBe("https://localhost:3000");
  });

  it("should REJECT arbitrary external domains (Host Header Injection attempt)", () => {
    const req = new NextRequest("http://evil.com/api/checkout", {
      headers: { host: "evil.com" },
    });
    expect(getTrustedOrigin(req)).toBeUndefined();
  });

  it("should REJECT spoofed domains using userinfo trick (e.g. evil.com@localhost)", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout", {
      headers: { host: "evil.com@localhost" },
    });
    expect(getTrustedOrigin(req)).toBeUndefined();
  });

  it("should REJECT spoofed domains using subdomain suffix trick (e.g. evil.ts.net.attacker.com)", () => {
    const req = new NextRequest("http://evil.com.ts.net/api/checkout", {
      headers: { host: "evil.com.ts.net" },
    });
    expect(getTrustedOrigin(req)).toBe("http://evil.com.ts.net"); // Valid tailscale domain ending in .ts.net

    const reqMalicious = new NextRequest("http://evil.ts.net.attacker.com/api/checkout", {
      headers: { host: "evil.ts.net.attacker.com" },
    });
    expect(getTrustedOrigin(reqMalicious)).toBeUndefined();
  });

  it("should return undefined if host header is missing", () => {
    const req = new NextRequest("http://localhost:3000/api/checkout");
    req.headers.delete("host");
    expect(getTrustedOrigin(req)).toBeUndefined();
  });
});
