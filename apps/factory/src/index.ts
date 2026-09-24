#!/usr/bin/env node
import { existsSync } from "node:fs";

import { runFactory } from "./cli.js";

// Load a repo-root `.env` if present, the way a framework dev server would, so a
// BYOK key (ADR 2) needs no `export`. Node's built-in loader — no `dotenv`
// dependency, because the "nothing already present does the job" bar isn't met.
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * The `palier-factory` entry point (content-factory.md §4). Wires the real world
 * — argv, cwd, the clock, stdout, the environment — to the pure CLI. `now` is the
 * one nondeterministic input; pass `--` nothing and it stamps the batch with the
 * current instant. Everything downstream is deterministic given it.
 */
const main = async (): Promise<void> => {
  const code = await runFactory(process.argv.slice(2), {
    root: process.cwd(),
    // Pinned for the committed sample batch so it rebuilds byte-identically
    // (content-factory.md §4.6); defaults to the current instant otherwise.
    now: process.env.PALIER_NOW ?? new Date().toISOString(),
    log: (line) => process.stdout.write(`${line}\n`),
    env: process.env,
  });
  process.exitCode = code;
};

void main();
