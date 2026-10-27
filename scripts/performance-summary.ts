import { readFile } from "node:fs/promises";
import { summarizePerformanceLogs } from "../src/features/performance/summary";

const files = process.argv.slice(2);
if (!files.length)
  throw new Error(
    "Usage: npm run performance:summary -- path/to/runtime.jsonl [more.jsonl]",
  );
const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));
console.log(
  JSON.stringify(
    summarizePerformanceLogs(
      contents.flatMap((content) => content.split("\n")),
    ),
    null,
    2,
  ),
);
