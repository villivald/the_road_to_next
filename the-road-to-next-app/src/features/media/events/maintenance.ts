import { inngest } from "@/lib/inngest";
import { cleanupMedia } from "../service/cleanup";

export const mediaMaintenance = inngest.createFunction(
  { id: "cleanup-media", triggers: [{ cron: "*/5 * * * *" }] },
  async () => {
    const result = await cleanupMedia();

    if (result.failed) {
      throw new Error(
        `Media cleanup: ${result.failed} files could not be removed; retries are queued.`,
      );
    }

    return result;
  },
);
