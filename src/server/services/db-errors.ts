export function isUniqueViolation(error: unknown, constraintName: string): boolean {
  // Drizzle wraps postgres.js's raw PostgresError in its own error, with the real
  // Postgres fields (code, constraint_name) on `.cause`, not on the thrown error itself.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "23505" &&
    "constraint_name" in cause &&
    (cause as { constraint_name?: string }).constraint_name === constraintName
  );
}
