import { assertTestDatabase, testOrigin } from "./environment";

// Only the dedicated isolated challenge suite loads this provider fixture.
assertTestDatabase(process.env);
if (
  process.env.TURNSTILE_SECRET_KEY !== "isolated-challenge-secret" ||
  process.env.APP_URL !== testOrigin
)
  throw new Error("Challenge fixture requires the isolated test environment");

const originalFetch = globalThis.fetch;
const used = new Set<string>();
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
    return originalFetch(input, init);
  }
  const body = init?.body;
  const token =
    body instanceof URLSearchParams ? (body.get("response") ?? "") : "";
  const match =
    /^fixture:(sign_up|password_recovery|verification_resend):[a-f0-9-]{36}$/.exec(
      token,
    );
  const success = !!match && !used.has(token);
  if (success) used.add(token);
  return Response.json({
    success,
    hostname: new URL(testOrigin).hostname,
    action: match?.[1],
  });
};
