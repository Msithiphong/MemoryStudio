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

export type Db = ReturnType<typeof getDb>;
type TransactionCallback = Parameters<Db["transaction"]>[0];
/** A plain db handle or an in-flight transaction — repositories accept either so a service can compose multiple calls into one atomic transaction. */
export type DbExecutor = Db | Parameters<TransactionCallback>[0];
