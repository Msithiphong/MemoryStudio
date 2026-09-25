import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // DB-backed tests go through Supabase's connection pooler, which adds real network
    // latency beyond vitest's 5s default — without this, otherwise-passing assertions
    // can still fail the test on a timeout.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Each test file opens its own postgres.js pool (up to 10 connections). Running files
    // in parallel multiplies that against the session pooler's connection cap and causes
    // real (not flaky) failures under load; every file passes cleanly on its own. Trading
    // some suite speed for reliability is the right call for this project's size.
    fileParallelism: false,
  },
});
