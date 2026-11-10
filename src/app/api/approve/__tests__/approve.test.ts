import { NextRequest } from "next/server";
import { POST } from "../route";
import { ensureSeeded, getItem, negotiate, resetDemo } from "@/lib/store";
import { getPgPool } from "@/lib/db";

describe("POST /api/approve human-in-the-loop escalation", () => {
  beforeEach(async () => {
    process.env.CFC_DISABLE_API_AUTH = "true";
    process.env.CFC_DB = "off";
    await resetDemo();
  });

  afterAll(async () => {
    const pool = getPgPool();
    if (pool) await pool.end();
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: "{ not valid json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing or invalid itemId", async () => {
    const req = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ decision: "approve" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId");
  });

  it("returns 400 when itemId exceeds maximum length of 100 characters", async () => {
    const longId = "a".repeat(101);
    const req = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: longId, decision: "approve" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId must be a non-empty string of at most 100 characters");
  });

  it("returns 400 for invalid decision", async () => {
    const req = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pedal", decision: "maybe" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("decision");
  });

  it("returns 400 if item has no pending offer to approve", async () => {
    await ensureSeeded();
    // demo_pedal has no seed messages and no pending offer
    const req = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: "demo_pedal", decision: "approve" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No pending offer");
  });

  it("approves below-floor escalated offer and marks status offer-accepted", async () => {
    await ensureSeeded();
    const item = getItem("demo_pokemon")!;
    // Escalate by sending an offer below floor (€65) but above human approval limit
    await negotiate(item, {
      itemId: item.id,
      buyerName: "Lowballer",
      text: "Would you take €45?",
      offer: 45,
      ts: Date.now(),
    });

    expect(item.status).toBe("escalated");
    expect(item.pendingOffer).toBeDefined();
    expect(item.pendingOffer?.offer).toBe(45);

    const approveReq = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: item.id, decision: "approve" }),
    });
    const res = await POST(approveReq);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.action).toBe("approved");

    const updated = getItem(item.id)!;
    expect(updated.status).toBe("offer-accepted");
    expect(updated.payment.amount).toBe(45);
    expect(updated.pendingOffer).toBeUndefined();
  });

  it("declines escalated offer and leaves item listed/engaged", async () => {
    await ensureSeeded();
    const item = getItem("demo_pokemon")!;
    await negotiate(item, {
      itemId: item.id,
      buyerName: "Lowballer",
      text: "Would you take €45?",
      offer: 45,
      ts: Date.now(),
    });

    const declineReq = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: item.id, decision: "decline" }),
    });
    const res = await POST(declineReq);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.action).toBe("declined");

    const updated = getItem(item.id)!;
    expect(updated.status).toBe("buyer-engaged");
    expect(updated.pendingOffer).toBeUndefined();
  });

  it("does not leak internal error details on server error", async () => {
    await ensureSeeded();
    const item = getItem("demo_pokemon")!;
    await negotiate(item, {
      itemId: item.id,
      buyerName: "Lowballer",
      text: "Would you take €45?",
      offer: 45,
      ts: Date.now(),
    });

    // Cause an unexpected error in the approval flow (e.g., throwing inside getItem)
    const storeModule = require("@/lib/store");
    const originalGetItem = storeModule.getItem;
    jest.spyOn(storeModule, "getItem").mockImplementationOnce(() => {
      throw new Error("Sensitive database table user_credentials not found");
    });

    const approveReq = new NextRequest("http://localhost:3000/api/approve", {
      method: "POST",
      body: JSON.stringify({ itemId: item.id, decision: "approve" }),
    });
    const res = await POST(approveReq);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to process approval" });
    expect(body.details).toBeUndefined();

    storeModule.getItem = originalGetItem;
  });
});
