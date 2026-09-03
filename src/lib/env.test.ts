import { describe, expect, it } from "vitest";
import { parseOrThrow, serverEnvSchema } from "./env";

describe("server env schema", () => {
  it("defaults NODE_ENV to development when unset", () => {
    const result = serverEnvSchema.parse({});
    expect(result.NODE_ENV).toBe("development");
  });

  it("accepts a fully-specified valid environment", () => {
    const result = serverEnvSchema.parse({
      NODE_ENV: "production",
      APP_URL: "https://memorystudio.example.com",
      EMAIL_FROM: "hello@memorystudio.example.com",
    });
    expect(result.NODE_ENV).toBe("production");
    expect(result.APP_URL).toBe("https://memorystudio.example.com");
    expect(result.EMAIL_FROM).toBe("hello@memorystudio.example.com");
  });

  it("rejects a malformed APP_URL", () => {
    expect(() => serverEnvSchema.parse({ APP_URL: "not-a-url" })).toThrow();
  });

  it("rejects a malformed EMAIL_FROM", () => {
    expect(() => serverEnvSchema.parse({ EMAIL_FROM: "not-an-email" })).toThrow();
  });

  it("treats an empty-string optional var the same as unset, via parseOrThrow", () => {
    const result = parseOrThrow(
      serverEnvSchema,
      { DATABASE_URL: "", RESEND_API_KEY: "", EMAIL_FROM: "" },
      "server",
    );
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.RESEND_API_KEY).toBeUndefined();
    expect(result.EMAIL_FROM).toBeUndefined();
  });
});
