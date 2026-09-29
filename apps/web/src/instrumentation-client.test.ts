import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ZOD_CONFIG_GLOBAL, turnOffZodCodeGeneration } from "./instrumentation-client";

describe("turnOffZodCodeGeneration", () => {
  it("leaves zod jitless in this process once the file has run, which the strict CSP needs (D134)", () => {
    expect(z.config().jitless).toBe(true);
  });

  it("creates the config zod will read when it loads later", () => {
    const scope: Record<string, unknown> = {};
    turnOffZodCodeGeneration(scope);
    expect(scope[ZOD_CONFIG_GLOBAL]).toEqual({ jitless: true });
  });

  it("keeps a config zod already made, the object zod holds, and only adds jitless", () => {
    const existing = { customError: "kept" };
    const scope: Record<string, unknown> = { [ZOD_CONFIG_GLOBAL]: existing };
    turnOffZodCodeGeneration(scope);
    expect(scope[ZOD_CONFIG_GLOBAL]).toBe(existing);
    expect(existing).toEqual({ customError: "kept", jitless: true });
  });

  it("replaces something that is not a config", () => {
    const scope: Record<string, unknown> = { [ZOD_CONFIG_GLOBAL]: null };
    turnOffZodCodeGeneration(scope);
    expect(scope[ZOD_CONFIG_GLOBAL]).toEqual({ jitless: true });
  });
});
