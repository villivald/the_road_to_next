import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

// Pulled OIDC credentials expire; standalone maintenance uses the static Blob token.
if (process.env.BLOB_READ_WRITE_TOKEN) delete process.env.VERCEL_OIDC_TOKEN;

const { backfillImageVariants, pendingImageBackfill } =
  await import("../src/features/media/service/backfill");
const { prisma } = await import("../src/lib/prisma");
const args = process.argv.slice(2);
const limitIndex = args.indexOf("--limit");
const limit = limitIndex === -1 ? 100 : Number(args[limitIndex + 1]);
const allowed = new Set(["--apply", "--dry-run", "--limit"]);

try {
  if (
    args.some(
      (arg, index) =>
        !allowed.has(arg) && !(limitIndex !== -1 && index === limitIndex + 1),
    ) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    (args.includes("--apply") && args.includes("--dry-run"))
  ) {
    throw new Error(
      "Usage: npm run media:backfill -- [--dry-run | --apply] [--limit 1-500]",
    );
  }
  if (!args.includes("--apply")) {
    console.log({
      apply: false,
      eligible: await prisma.media.count({ where: pendingImageBackfill }),
      limit,
    });
  } else {
    const result = await backfillImageVariants(
      limit,
      ({ imageId, stage, message }) => {
        console.error(`Image ${imageId} (${stage}): ${message}`);
      },
    );
    console.log(result);
    process.exitCode = result.failed ? 1 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Backfill failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
