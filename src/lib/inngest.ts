import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "wishlist",
  checkpointing: false,
  // Bound each SDK request, including event publishing retries during outages.
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(2_000)])
        : AbortSignal.timeout(2_000),
    }),
});
