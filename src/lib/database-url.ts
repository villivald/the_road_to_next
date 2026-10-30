// Neon supports hostname-verified TLS. Make the existing pg default explicit
// without rewriting other providers or an explicitly selected compatibility mode.
export const withExplicitNeonTls = (connectionString: string | undefined) => {
  if (!connectionString) return connectionString;
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname.endsWith(".neon.tech") ||
    url.searchParams.get("sslmode") !== "require" ||
    url.searchParams.get("uselibpqcompat") === "true"
  )
    return connectionString;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
};
