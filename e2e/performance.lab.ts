import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, platform, totalmem } from "node:os";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashToken } from "../src/utils/crypto";
import { testOrigin } from "./environment";
import {
  assertPerformanceDatabase,
  performanceDatabaseUrl,
} from "./performance-environment";

assertPerformanceDatabase(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: performanceDatabaseUrl },
    { schema: "performance" },
  ),
});
const ownerId = "perf-lab-owner";
const token = randomBytes(32).toString("hex");
const outputDirectory = `.local/performance/${new Date().toISOString().slice(0, 10)}`;
const candidateFiles = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "src",
    "scripts",
    "e2e",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "playwright.performance.config.ts",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .toSorted();
const candidateHash = createHash("sha256");
for (const file of candidateFiles)
  candidateHash
    .update(file)
    .update("\0")
    .update(readFileSync(file))
    .update("\0");
const candidate = {
  sha256: candidateHash.digest("hex"),
  files: candidateFiles.length,
  dirty: Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  ),
};
const profiles = [
  {
    name: "desktop",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    latency: 0,
    cpu: 1,
  },
  {
    name: "mobile-throttled",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    latency: 150,
    cpu: 4,
  },
] as const;

const clean = async () => {
  assertPerformanceDatabase(process.env);
  await prisma.media.deleteMany({ where: { id: { startsWith: "perf-lab-" } } });
  await prisma.wishlist.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { id: ownerId } });
};

const seed = async (listCount: number, wishCount: number) => {
  await clean();
  await prisma.user.create({
    data: {
      id: ownerId,
      username: "perf-lab-owner",
      name: "Performance fixture",
      email: "perf-lab@example.test",
      emailVerified: true,
      passwordHash: "unusable-lab-password",
      sessions: {
        create: {
          id: hashToken(token),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      },
    },
  });
  const lists = Array.from({ length: listCount }, (_, index) => ({
    id: `perf-lab-list-${index.toString().padStart(3, "0")}`,
    title: `Performance list ${index}`,
    description: "Synthetic benchmark content.",
    ownerId,
    publication: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    reservationsEnabled: true,
  }));
  await prisma.$transaction([
    prisma.wishlist.createMany({ data: lists }),
    prisma.membership.createMany({
      data: lists.map((list) => ({
        wishlistId: list.id,
        userId: ownerId,
        role: "ADMIN" as const,
      })),
    }),
  ]);
  const wishes = lists.flatMap((list) =>
    Array.from({ length: wishCount }, (_, index) => ({
      id: `${list.id}-wish-${index}`,
      wishlistId: list.id,
      authorId: ownerId,
      title: `Synthetic wish ${index}`,
      description: "Synthetic wish for performance measurement.",
      priority: 3,
      priceMinor: 2999,
      currency: "EUR" as const,
    })),
  );
  // Chunk inserts so the larger dataset stays below PostgreSQL's bind limit.
  for (let offset = 0; offset < wishes.length; offset += 500)
    await prisma.wish.createMany({ data: wishes.slice(offset, offset + 500) });
  await mkdir(".local/media-test/images", { recursive: true });
  const { readFile, link, rm } = await import("node:fs/promises");
  const source = "src/assets/illustrations/sharing-card-botanical-en.png";
  const original = await readFile(source);
  const variants = await Promise.all(
    [1600, 200, 400, 800, 1200].map(async (width) => ({
      width,
      buffer: await sharp(original)
        .resize({ width })
        .webp({ quality: 80 })
        .toBuffer(),
    })),
  );
  const shared = randomUUID();
  const sharedPaths = variants.map(
    ({ width }) =>
      `.local/media-test/images/${shared}${width === 1600 ? "" : `-${width}`}.webp`,
  );
  const paths: string[] = [...sharedPaths];
  try {
    for (const [index, { buffer }] of variants.entries())
      await writeFile(sharedPaths[index], buffer);
    const media = wishes.map((wish, index) => ({
      id: `perf-lab-media-${index}`,
      pathname: `images/${randomUUID()}.webp`,
      provider: "LOCAL" as const,
      state: "READY" as const,
      alt: "Synthetic botanical image",
      width: 1600,
      height: Math.round((1600 * 630) / 1200),
      bytes: variants[0].buffer.length,
      variantWidths: [200, 400, 800, 1200],
      variantVersion: 1,
      cleanupAfter: new Date(Date.now() + 3_600_000),
      wishId: wish.id,
    }));
    // Every wish is image-bearing to expose per-parent preview overfetch. Hard
    // links keep disk usage bounded while each media URL remains distinct.
    for (const image of media) {
      for (const [index, { width }] of variants.entries()) {
        const path = `.local/media-test/${image.pathname.replace(/\.webp$/, `${width === 1600 ? "" : `-${width}`}.webp`)}`;
        await link(sharedPaths[index], path);
        paths.push(path);
      }
    }
    for (let offset = 0; offset < media.length; offset += 500)
      await prisma.media.createMany({
        data: media.slice(offset, offset + 500),
      });
  } catch (error) {
    await Promise.all(paths.map((path) => rm(path, { force: true })));
    throw error;
  }
  return {
    lists,
    removeFiles: async () => {
      for (const path of paths) await rm(path, { force: true });
    },
  };
};

test.afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

for (const dataset of [
  { name: "empty", lists: 0, wishes: 0 },
  { name: "typical", lists: 10, wishes: 20 },
  { name: "larger", lists: 100, wishes: 50 },
]) {
  test(`${dataset.name}: isolated query and browser capacity baseline`, async ({
    browser,
  }, info) => {
    test.setTimeout(900_000);
    const fixture = await seed(dataset.lists, dataset.wishes);
    try {
      expect(await prisma.wishlist.count()).toBe(dataset.lists);
      expect(await prisma.wish.count()).toBe(dataset.lists * dataset.wishes);
      const queries = JSON.parse(
        execFileSync(
          process.execPath,
          ["--import", "tsx", "scripts/performance-queries.ts"],
          { encoding: "utf8", env: process.env },
        ),
      );
      // Keep immediate bulk-seed results, then compare steady-state plans with
      // current statistics. Autovacuum timing must not decide dataset acceptance.
      await prisma.$executeRawUnsafe(
        'ANALYZE "performance"."User", "performance"."Wishlist", "performance"."Membership", "performance"."Wish", "performance"."Media", "performance"."Reservation"',
      );
      const steadyQueries = JSON.parse(
        execFileSync(
          process.execPath,
          ["--import", "tsx", "scripts/performance-queries.ts"],
          { encoding: "utf8", env: process.env },
        ),
      );
      const samples = [];
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        `${outputDirectory}/${dataset.name}-queries.json`,
        JSON.stringify({ dataset, candidate, queries, steadyQueries }, null, 2),
      );
      const interactions = [];
      const failures: string[] = [];
      for (const profile of profiles) {
        for (const locale of ["en", "fi"] as const) {
          for (const route of [
            ...(dataset.name === "empty" ? ["/", "/premium"] : []),
            "/lists",
            "/browse",
            "/browse?view=wishes",
            ...(fixture.lists.length ? [`/lists/${fixture.lists[0].id}`] : []),
          ]) {
            for (let sample = 0; sample < 3; sample += 1) {
              const context = await browser.newContext({
                viewport: profile.viewport,
                deviceScaleFactor: profile.deviceScaleFactor,
                colorScheme: locale === "fi" ? "dark" : "light",
              });
              try {
                if (route !== "/" && route !== "/premium")
                  await context.addCookies([
                    { name: "session", value: token, url: testOrigin },
                  ]);
                const page = await context.newPage();
                page.on("pageerror", (error) => failures.push(error.name));
                page.on("response", (response) => {
                  if (response.status() >= 500)
                    failures.push(`HTTP ${response.status()}`);
                  else if (
                    response.status() >= 400 &&
                    new URL(response.url()).pathname.startsWith("/api/media/")
                  )
                    failures.push(`media ${response.status()}`);
                });
                const cdp = await context.newCDPSession(page);
                await cdp.send("Network.enable");
                await cdp.send("Network.emulateNetworkConditions", {
                  offline: false,
                  latency: profile.latency,
                  downloadThroughput: profile.latency ? 1_600_000 / 8 : -1,
                  uploadThroughput: profile.latency ? 750_000 / 8 : -1,
                });
                await cdp.send("Emulation.setCPUThrottlingRate", {
                  rate: profile.cpu,
                });
                await page.addInitScript(() => {
                  const observed = { lcp: 0, cls: 0 };
                  Object.assign(window, { labVitals: observed });
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries())
                      observed.lcp = entry.startTime;
                  }).observe({
                    type: "largest-contentful-paint",
                    buffered: true,
                  });
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      const shift = entry as PerformanceEntry & {
                        value: number;
                        hadRecentInput: boolean;
                      };
                      if (!shift.hadRecentInput) observed.cls += shift.value;
                    }
                  }).observe({ type: "layout-shift", buffered: true });
                });
                for (const cache of [
                  "empty-browser",
                  "warm-browser",
                ] as const) {
                  await page.goto(`/${locale}${route === "/" ? "" : route}`);
                  await expect(page.locator("main h1")).toBeVisible();
                  await expect(
                    page.locator("main [data-loading-preview]"),
                  ).toHaveCount(0);
                  await page.evaluate(() => document.fonts.ready);
                  await page.waitForLoadState("networkidle");
                  const measurement = await page.evaluate(() => {
                    const navigation = performance.getEntriesByType(
                      "navigation",
                    )[0] as PerformanceNavigationTiming;
                    const resources = performance.getEntriesByType(
                      "resource",
                    ) as PerformanceResourceTiming[];
                    const entries = [navigation, ...resources];
                    return {
                      ttfbMs: navigation.responseStart - navigation.startTime,
                      documentMs: navigation.duration,
                      transferBytes: entries.reduce(
                        (sum, entry) => sum + entry.transferSize,
                        0,
                      ),
                      jsBytes: resources
                        .filter((entry) => /\.js(?:\?|$)/.test(entry.name))
                        .reduce((sum, entry) => sum + entry.encodedBodySize, 0),
                      imageBytes: resources
                        .filter((entry) => entry.initiatorType === "img")
                        .reduce((sum, entry) => sum + entry.encodedBodySize, 0),
                      requests: entries.length,
                      ...(
                        window as Window & {
                          labVitals?: { lcp: number; cls: number };
                        }
                      ).labVitals,
                      overflow:
                        document.documentElement.scrollWidth > innerWidth + 1,
                    };
                  });
                  expect(measurement.overflow).toBe(false);
                  samples.push({
                    profile: profile.name,
                    locale,
                    route: route.includes("perf-lab") ? "/lists/[id]" : route,
                    cache,
                    sample,
                    ...measurement,
                  });
                }
                if (route === "/browse") {
                  const start = performance.now();
                  await page
                    .getByRole("navigation", {
                      name:
                        locale === "fi" ? "Selaa sisältöä" : "Browse content",
                    })
                    .getByRole("link", {
                      name: locale === "fi" ? "Toiveet" : "Wishes",
                      exact: true,
                    })
                    .click();
                  await expect(page).toHaveURL(/view=wishes/);
                  await expect(
                    page.locator("main [data-loading-preview]"),
                  ).toHaveCount(0);
                  await expect(
                    page.locator("main input[name='q']"),
                  ).toBeVisible();
                  interactions.push({
                    profile: profile.name,
                    locale,
                    name: "browse-tab",
                    sample,
                    durationMs: performance.now() - start,
                  });
                }
              } finally {
                await context.close();
              }
            }
          }
        }
      }
      expect(failures).toEqual([]);
      const report = {
        kind: "lab",
        candidate,
        machine: {
          node: process.version,
          platform: platform(),
          arch: arch(),
          cpu: cpus()[0]?.model,
          logicalCpus: cpus().length,
          memoryBytes: totalmem(),
        },
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        date: new Date().toISOString(),
        dataset,
        browser: browser.version(),
        conditions: {
          statistics:
            "queries before ANALYZE; steadyQueries and browser loads after test-schema ANALYZE",
          actors:
            "Homepage and Premium signed out; capacity pages use a verified owner",
          profiles,
          sampleCount: 3,
          serviceSamples: 5,
          concurrency: 1,
          storage:
            "local private files; synthetic artwork; every wish image-bearing",
          cache:
            "fresh context then reload; server/database warm, no production cold-start simulation",
        },
        queries,
        steadyQueries,
        samples,
        interactions,
      };
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        `${outputDirectory}/${dataset.name}.json`,
        JSON.stringify(report, null, 2),
      );
      await info.attach(`${dataset.name}-lab`, {
        body: JSON.stringify(report),
        contentType: "application/json",
      });
    } finally {
      await clean();
      await fixture.removeFiles();
    }
  });
}
