import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { cleanupMedia } = await import("../src/features/media/service/cleanup");
const { prisma } = await import("../src/lib/prisma");

try {
  const result = await cleanupMedia();
  console.log(result);
  process.exitCode = result.failed ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
