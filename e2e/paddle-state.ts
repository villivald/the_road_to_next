import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertTestDatabase } from "./environment";
import type { PaddleState } from "./paddle-fixture";

assertTestDatabase(process.env);
const statePath = resolve(".local/paddle-test.json");

export const readPaddleState = async () =>
  JSON.parse(await readFile(statePath, "utf8")) as PaddleState;

export const writePaddleState = async (state: PaddleState) => {
  const temporary = `${statePath}.${randomUUID()}.tmp`;
  try {
    // Readers must see a complete old or new snapshot, never a truncated file.
    await writeFile(temporary, JSON.stringify(state));
    await rename(temporary, statePath);
  } finally {
    await rm(temporary, { force: true });
  }
};
