import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;

  if (!serverEnv.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env.local to enable database-backed features.",
    );
  }

  const client = postgres(serverEnv.DATABASE_URL);
  cached = drizzle(client, { schema });
  return cached;
}
