import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertTestDatabase } from "./environment";
import { emptyPaddleState, paddleFixtureResponse } from "./paddle-fixture";
import { readPaddleState, writePaddleState } from "./paddle-state";

// Loaded only by Playwright's server command, never by the application or build.
assertTestDatabase(process.env);
await mkdir(resolve(".local"), { recursive: true });
await writePaddleState(emptyPaddleState());
const eventsPath = resolve(".local/background-events-test.jsonl");
await writeFile(eventsPath, "");
const originalFetch = globalThis.fetch;
let pending: Promise<unknown> = Promise.resolve();

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  // This isolated browser suite has no Inngest server. Acknowledging fixture
  // events avoids external sends; integration tests execute the real workers.
  if (
    url.origin === "http://127.0.0.1:8289" &&
    url.pathname.startsWith("/e/")
  ) {
    await appendFile(eventsPath, `${String(init?.body)}\n`);
    return Response.json({ status: 200, ids: [] });
  }
  if (url.origin !== "https://sandbox-api.paddle.com")
    return originalFetch(input, init);
  const response = pending.then(async () => {
    const state = await readPaddleState();
    const before = JSON.stringify(state);
    const result = paddleFixtureResponse(state, url, init);
    // A read must not overwrite a payment completed concurrently by the test.
    if (JSON.stringify(state) !== before) await writePaddleState(state);
    return result;
  });
  pending = response.catch(() => undefined);
  return response;
};
