import { getPgPool } from "@/lib/db";
import { Pool } from "pg";

jest.mock("pg", () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn().mockResolvedValue(mClient),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Pool: jest.fn(() => mPool),
  };
});

describe("src/lib/db.ts security and persistence tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.CFC_DB;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns null when DATABASE_URL is not set (never uses hardcoded credentials)", () => {
    delete process.env.DATABASE_URL;
    const pool = getPgPool();
    expect(pool).toBeNull();
    expect(Pool).not.toHaveBeenCalled();
  });

  it("returns null when DATABASE_URL is empty or whitespace only", () => {
    process.env.DATABASE_URL = "   ";
    const pool = getPgPool();
    expect(pool).toBeNull();
    expect(Pool).not.toHaveBeenCalled();
  });

  it("returns null when CFC_DB is 'off' even if DATABASE_URL is provided", () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/cashfromchaos";
    process.env.CFC_DB = "off";
    const pool = getPgPool();
    expect(pool).toBeNull();
    expect(Pool).not.toHaveBeenCalled();
  });
});
