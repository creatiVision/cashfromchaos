import { POST } from "../route";
import { NextRequest } from "next/server";
import { ensureSeeded } from "@/lib/store";

describe("POST /api/negotiate length validation", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv, CFC_DISABLE_API_AUTH: "true" };
    await ensureSeeded();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createRequest(body: unknown) {
    return new NextRequest("http://localhost:3000/api/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 if itemId exceeds length limit", async () => {
    const longItemId = "a".repeat(101);
    const req = createRequest({ itemId: longItemId, text: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("itemId must be a string of at most 100 characters");
  });

  it("returns 400 if text exceeds length limit", async () => {
    const longText = "a".repeat(2001);
    const req = createRequest({ itemId: "item-1", text: longText });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("text must be a string of at most 2000 characters");
  });

  it("returns 400 if buyerName exceeds length limit", async () => {
    const longBuyerName = "a".repeat(101);
    const req = createRequest({ itemId: "item-1", text: "Hello", buyerName: longBuyerName });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("buyerName must be a string of at most 100 characters");
  });

  it("accepts valid requests within length limits", async () => {
    const items = require("@/lib/store").listItems();
    const item = items[0];
    const req = createRequest({
      itemId: item.id,
      text: "Offer 50",
      buyerName: "Valid Buyer",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBeDefined();
  });
});
