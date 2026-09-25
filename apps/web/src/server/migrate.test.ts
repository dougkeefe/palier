import { describe, expect, it, vi } from "vitest";

import { migrateDatabase, migrationDecision } from "./migrate";

const URL_ = "postgres://user:pw@db.example/palier";

describe("migrationDecision", () => {
  it("does not migrate without a DATABASE_URL", () => {
    expect(migrationDecision({})).toEqual({ run: false, reason: expect.stringContaining("no DATABASE_URL") });
  });

  it("treats an empty DATABASE_URL as none", () => {
    expect(migrationDecision({ DATABASE_URL: "" })).toMatchObject({ run: false });
  });

  it("never migrates from a preview deployment, even with a database configured", () => {
    expect(migrationDecision({ DATABASE_URL: URL_, VERCEL_ENV: "preview" })).toEqual({
      run: false,
      reason: "a preview deployment never migrates the database",
    });
  });

  it("migrates a production deployment", () => {
    expect(migrationDecision({ DATABASE_URL: URL_, VERCEL_ENV: "production" })).toEqual({ run: true, url: URL_ });
  });

  it("migrates when a person runs it off Vercel with a DATABASE_URL", () => {
    expect(migrationDecision({ DATABASE_URL: URL_ })).toEqual({ run: true, url: URL_ });
  });
});

describe("migrateDatabase", () => {
  it("applies the migrations folder to the database when it should", async () => {
    const apply = vi.fn(() => Promise.resolve());

    const ran = await migrateDatabase({ env: { DATABASE_URL: URL_ }, apply, log: () => undefined, folder: "/app/drizzle" });

    expect({ ran, calls: apply.mock.calls }).toEqual({ ran: true, calls: [[URL_, "/app/drizzle"]] });
  });

  it("defaults to the drizzle folder under the working directory", async () => {
    const apply = vi.fn(() => Promise.resolve());

    await migrateDatabase({ env: { DATABASE_URL: URL_ }, apply, log: () => undefined });

    expect(apply).toHaveBeenCalledWith(URL_, `${process.cwd()}/drizzle`);
  });

  it("says why it skipped, and touches nothing", async () => {
    const apply = vi.fn(() => Promise.resolve());
    const log = vi.fn();

    const ran = await migrateDatabase({ env: { DATABASE_URL: URL_, VERCEL_ENV: "preview" }, apply, log });

    expect({ ran, applied: apply.mock.calls.length, said: log.mock.calls[0]?.[0] }).toEqual({
      ran: false,
      applied: 0,
      said: "Skipping migrations: a preview deployment never migrates the database.",
    });
  });

  it("lets a failed migration through, so the deploy fails rather than shipping on an old schema", async () => {
    const apply = vi.fn(() => Promise.reject(new Error("relation already exists")));

    await expect(migrateDatabase({ env: { DATABASE_URL: URL_ }, apply, log: () => undefined })).rejects.toThrow("relation already exists");
  });
});
