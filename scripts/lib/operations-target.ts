export const operationsTarget = (
  connectionString: string | undefined,
  expected: {
    host?: string;
    port?: string;
    database?: string;
    schema?: string;
  },
) => {
  if (!connectionString || Object.values(expected).some((value) => !value))
    throw new Error("Specify the database host, port, database and schema.");
  const url = new URL(connectionString);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    [
      "host",
      "hostaddr",
      "port",
      "dbname",
      "database",
      "service",
      "options",
    ].some((key) => url.searchParams.has(key)) ||
    url.hostname.includes("%") ||
    url.hostname !== expected.host ||
    (url.port || "5432") !== expected.port ||
    decodeURIComponent(url.pathname.slice(1)) !== expected.database ||
    (url.searchParams.get("schema") ?? "public") !== expected.schema
  )
    throw new Error(
      "Database target does not match the explicit confirmation.",
    );
  return expected;
};
