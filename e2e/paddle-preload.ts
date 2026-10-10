import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertTestDatabase } from "./environment";
import {
  emptyPaddleState,
  paddleFixtureResponse,
  type PaddleState,
} from "./paddle-fixture";

// Loaded only by Playwright's server command, never by the application or build.
assertTestDatabase(process.env);
const statePath = resolve(".local/paddle-test.json");
await mkdir(resolve(".local"), { recursive: true });
await writeFile(statePath, JSON.stringify(emptyPaddleState()));
const originalFetch = globalThis.fetch;
let pending: Promise<unknown> = Promise.resolve();

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== "https://sandbox-api.paddle.com")
    return originalFetch(input, init);
  const response = pending.then(async () => {
    const state = JSON.parse(await readFile(statePath, "utf8")) as PaddleState;
    const result = paddleFixtureResponse(state, url, init);
    await writeFile(statePath, JSON.stringify(state));
    return result;
  });
  pending = response.catch(() => undefined);
  return response;
};
