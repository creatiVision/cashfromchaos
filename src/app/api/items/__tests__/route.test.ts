import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { getItem, resetDemo, ensureSeeded } from "@/lib/store";

describe("/api/items endpoints", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CFC_DISABLE_API_AUTH;
    delete process.env.CFC_API_TOKEN;
    await resetDemo();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("GET /api/items", () => {
    it("ensures store is seeded and returns list of items", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("items");
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBe(3);

      const ids = body.items.map((item: { id: string }) => item.id);
      expect(ids).toContain("demo_pokemon");
      expect(ids).toContain("demo_pedal");
      expect(ids).toContain("demo_furniture");
    });
  });

  describe("POST /api/items", () => {
    describe("Authentication", () => {
      it("returns 401 Unauthorized when CFC_API_TOKEN is set and token is missing or invalid", async () => {
        delete process.env.CFC_DISABLE_API_AUTH;
        process.env.CFC_API_TOKEN = "secret_token_123";

        // Missing Authorization header
        const reqNoAuth = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify({ clue: "Vintage camera" }),
        });
        const resNoAuth = await POST(reqNoAuth);
        expect(resNoAuth.status).toBe(401);
        const bodyNoAuth = await resNoAuth.json();
        expect(bodyNoAuth.error).toMatch(/Missing or invalid API token/);

        // Invalid Authorization header token
        const reqWrongAuth = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          headers: {
            Authorization: "Bearer wrong_token",
          },
          body: JSON.stringify({ clue: "Vintage camera" }),
        });
        const resWrongAuth = await POST(reqWrongAuth);
        expect(resWrongAuth.status).toBe(401);
      });

      it("succeeds when CFC_API_TOKEN is set and valid Bearer token is provided", async () => {
        delete process.env.CFC_DISABLE_API_AUTH;
        process.env.CFC_API_TOKEN = "secret_token_123";

        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          headers: {
            Authorization: "Bearer secret_token_123",
          },
          body: JSON.stringify({ clue: "Vintage Leica Camera" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body.item).toBeDefined();
        expect(body.item.intake.clue).toBe("Vintage Leica Camera");
      });
    });

    describe("Validation", () => {
      beforeEach(() => {
        process.env.CFC_DISABLE_API_AUTH = "true";
      });

      it("returns 400 Bad Request if body is missing 'clue'", async () => {
        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify({ notes: "Some notes without a clue" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body).toEqual({ error: "Missing 'clue'." });
      });

      it("returns 400 Bad Request if 'clue' is not a string", async () => {
        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify({ clue: 12345 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body).toEqual({ error: "Missing 'clue'." });
      });
    });

    describe("Item Creation", () => {
      beforeEach(() => {
        process.env.CFC_DISABLE_API_AUTH = "true";
      });

      it("creates a new item with default photo when photos array is missing or empty", async () => {
        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify({ clue: "Retro Sony Walkman" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body.item).toBeDefined();
        expect(body.item.intake.clue).toBe("Retro Sony Walkman");
        expect(body.item.intake.photos).toEqual(["/img/generic.svg"]);

        // Verify stored in memory store
        const storedItem = getItem(body.item.id);
        expect(storedItem).toBeDefined();
        expect(storedItem?.intake.clue).toBe("Retro Sony Walkman");
      });

      it("creates a new item with provided photos, notes, answers, and fulfillmentOverride", async () => {
        const intakePayload = {
          clue: "Game Boy Color Purple",
          photos: ["/img/gameboy1.jpg", "/img/gameboy2.jpg"],
          notes: "Works great, minor scratches on screen",
          answers: { q1: "Yes, turns on", q2: "No box" },
          fulfillmentOverride: "shipping" as const,
        };

        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify(intakePayload),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body.item).toBeDefined();
        expect(body.item.intake.clue).toBe(intakePayload.clue);
        expect(body.item.intake.photos).toEqual(intakePayload.photos);
        expect(body.item.intake.notes).toBe(intakePayload.notes);
        expect(body.item.intake.answers).toEqual(intakePayload.answers);
        expect(body.item.intake.fulfillmentOverride).toBe("shipping");
      });
    });

    describe("Item Overwriting", () => {
      beforeEach(() => {
        process.env.CFC_DISABLE_API_AUTH = "true";
      });

      it("overwrites an existing item when valid 'id' is provided, preserving id and createdAt", async () => {
        await ensureSeeded();
        const existingItem = getItem("demo_pokemon");
        expect(existingItem).toBeDefined();

        const originalCreatedAt = existingItem!.createdAt;

        const overwritePayload = {
          id: "demo_pokemon",
          clue: "Updated Pokemon Card Collection",
          notes: "Added answer to critical questions",
          answers: { condition: "Mint" },
        };

        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify(overwritePayload),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.item).toBeDefined();
        expect(body.item.id).toBe("demo_pokemon");
        expect(body.item.createdAt).toBe(originalCreatedAt);
        expect(body.item.intake.clue).toBe("Updated Pokemon Card Collection");
        expect(body.item.intake.answers).toEqual({ condition: "Mint" });

        // Verify in store
        const storedItem = getItem("demo_pokemon");
        expect(storedItem?.createdAt).toBe(originalCreatedAt);
        expect(storedItem?.intake.clue).toBe("Updated Pokemon Card Collection");
      });

      it("handles non-existent 'id' by creating a new item with 201 status", async () => {
        const payload = {
          id: "non_existent_item_id",
          clue: "Non existent item re-submission",
        };

        const req = new NextRequest("http://localhost:3000/api/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body.item).toBeDefined();
        expect(body.item.intake.clue).toBe("Non existent item re-submission");
      });
    });
  });
});
