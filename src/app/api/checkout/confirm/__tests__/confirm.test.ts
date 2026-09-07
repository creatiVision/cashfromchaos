import { NextRequest } from "next/server";
import { GET } from "../route";
import { getItem, resetDemo, ensureSeeded } from "@/lib/store";
import Stripe from "stripe";

jest.mock("stripe");

describe("GET /api/checkout/confirm", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    await resetDemo();
    await ensureSeeded();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 400 Bad Request if 'item' search param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/confirm?session=sim_demo_pokemon");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Missing item" });
  });

  it("returns 400 Bad Request if 'session' search param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=demo_pokemon");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Missing session" });
  });

  it("returns 404 Not Found if item does not exist in store", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=non_existent_item&session=sim_non_existent_item");
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Item not found" });
  });

  describe("Simulated Checkout Flow (STRIPE_SECRET_KEY not set)", () => {
    it("returns 400 Bad Request if simulated session ID does not match item ID", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=demo_pokemon&session=invalid_session_id");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Invalid simulated session" });
    });

    it("confirms payment, updates item status/fulfillment, and redirects when simulated session is valid", async () => {
      const itemId = "demo_pokemon";
      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${itemId}&session=sim_${itemId}`);
      const res = await GET(req);

      expect(res.status).toBe(307); // Next.js NextResponse.redirect default status
      expect(res.headers.get("location")).toBe(`http://localhost:3000/market/${itemId}?paid=1`);

      const item = getItem(itemId);
      expect(item?.payment.status).toBe("held");
      expect(item?.status).toBe("shipping-required");
      expect(item?.fulfillment).toBeDefined();
      expect(item?.ledger.length).toBeGreaterThan(0);
    });
  });

  describe("Stripe Checkout Flow (STRIPE_SECRET_KEY set)", () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
    });

    it("returns 400 Bad Request when Stripe SDK fails to retrieve session (throws error)", async () => {
      const mockRetrieve = jest.fn().mockRejectedValue(new Error("Stripe API Connection Error"));
      (Stripe as unknown as jest.Mock).mockImplementation(() => ({
        checkout: {
          sessions: {
            retrieve: mockRetrieve,
          },
        },
      }));

      const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=demo_pokemon&session=cs_test_error");
      const res = await GET(req);

      expect(mockRetrieve).toHaveBeenCalledWith("cs_test_error");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Invalid Stripe session" });
    });

    it("returns 400 Bad Request if session payment_status is not 'paid'", async () => {
      const mockRetrieve = jest.fn().mockResolvedValue({
        payment_status: "unpaid",
        metadata: { itemId: "demo_pokemon" },
      });
      (Stripe as unknown as jest.Mock).mockImplementation(() => ({
        checkout: {
          sessions: {
            retrieve: mockRetrieve,
          },
        },
      }));

      const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=demo_pokemon&session=cs_test_unpaid");
      const res = await GET(req);

      expect(mockRetrieve).toHaveBeenCalledWith("cs_test_unpaid");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Payment not completed" });
    });

    it("returns 400 Bad Request if session metadata itemId does not match query item parameter", async () => {
      const mockRetrieve = jest.fn().mockResolvedValue({
        payment_status: "paid",
        metadata: { itemId: "different_item_id" },
      });
      (Stripe as unknown as jest.Mock).mockImplementation(() => ({
        checkout: {
          sessions: {
            retrieve: mockRetrieve,
          },
        },
      }));

      const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=demo_pokemon&session=cs_test_wrong_item");
      const res = await GET(req);

      expect(mockRetrieve).toHaveBeenCalledWith("cs_test_wrong_item");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Invalid session for this item" });
    });

    it("confirms payment, updates item status/fulfillment, and redirects when Stripe session is valid and paid", async () => {
      const itemId = "demo_pokemon";
      const mockRetrieve = jest.fn().mockResolvedValue({
        payment_status: "paid",
        metadata: { itemId },
      });
      (Stripe as unknown as jest.Mock).mockImplementation(() => ({
        checkout: {
          sessions: {
            retrieve: mockRetrieve,
          },
        },
      }));

      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${itemId}&session=cs_test_valid`);
      const res = await GET(req);

      expect(mockRetrieve).toHaveBeenCalledWith("cs_test_valid");
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`http://localhost:3000/market/${itemId}?paid=1`);

      const item = getItem(itemId);
      expect(item?.payment.status).toBe("held");
      expect(item?.status).toBe("shipping-required");
      expect(item?.fulfillment).toBeDefined();
      expect(item?.ledger.length).toBeGreaterThan(0);
    });
  });
});
