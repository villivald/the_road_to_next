import { afterEach, beforeEach, vi } from "vitest";
import { inngest } from "@/lib/inngest";

// Database integration tests exercise persisted intents and workers themselves.
// Never publish fixture events to a real Inngest app.
beforeEach(() => {
  vi.spyOn(inngest, "send").mockResolvedValue({ ids: [] });
});
afterEach(() => vi.restoreAllMocks());
