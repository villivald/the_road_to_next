import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

// Pulled OIDC credentials expire; standalone maintenance uses the static Blob token.
if (process.env.BLOB_READ_WRITE_TOKEN) delete process.env.VERCEL_OIDC_TOKEN;

const { cleanupMedia } = await import("../src/features/media/service/cleanup");
const { prisma } = await import("../src/lib/prisma");

try {
  const result = await cleanupMedia();
  console.log(result);
  process.exitCode = result.failed ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
