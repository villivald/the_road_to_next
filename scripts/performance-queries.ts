import { PrismaPg } from "@prisma/adapter-pg";
import {
  assertPerformanceDatabase,
  performanceDatabaseUrl,
} from "../e2e/performance-environment";
import { PrismaClient } from "../src/generated/prisma/client";

assertPerformanceDatabase(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: performanceDatabaseUrl },
    { schema: "performance" },
  ),
  log: [{ emit: "event", level: "query" }],
});
// Install before importing the real services, in this isolated process only.
Object.assign(globalThis, { prisma });
let durations: number[] = [];
prisma.$on("query", ({ duration }) => durations.push(duration));
try {
  const { readOwnedWishlists } =
    await import("../src/features/wishlist/service/lists");
  const { discoverLists, discoverWishes } =
    await import("../src/features/discovery/service/discovery");
  const { readListWishes } =
    await import("../src/features/wish/service/wishes");
  const ownerId = "perf-lab-owner";
  const list = await prisma.wishlist.findFirst({
    where: { ownerId },
    select: { id: true },
  });
  const operations = [
    { name: "my-lists", run: () => readOwnedWishlists(ownerId) },
    { name: "browse-lists", run: () => discoverLists({}, ownerId) },
    { name: "browse-wishes", run: () => discoverWishes({}, ownerId) },
    ...(list
      ? [{ name: "list-detail", run: () => readListWishes(list.id, ownerId) }]
      : []),
  ];
  const results = [];
  for (const operation of operations) {
    await operation.run();
    for (let sample = 0; sample < 5; sample += 1) {
      durations = [];
      const start = performance.now();
      await operation.run();
      results.push({
        operation: operation.name,
        sample,
        durationMs: performance.now() - start,
        queryCount: durations.length,
        statementMs: [...durations],
        databaseMs: durations.reduce((sum, value) => sum + value, 0),
      });
    }
  }
  console.log(JSON.stringify(results));
} finally {
  await prisma.$disconnect();
}
