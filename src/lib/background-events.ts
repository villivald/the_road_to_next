import { inngest } from "./inngest";

export const backgroundEvents = {
  accountEmail: "wishlist/account-email.queued",
  billing: "wishlist/billing-event.received",
} as const;

// Call only after the transaction commits. Events contain opaque row IDs, never
// recipients, rendered messages, payment data, or credentials. The database is
// the durable outbox: a failed publish must not undo the user's operation.
export const publishBackgroundEvents = async (
  name: (typeof backgroundEvents)[keyof typeof backgroundEvents],
  ids: (string | undefined)[],
) => {
  const uniqueIds = [...new Set(ids.filter((id) => id !== undefined))];
  if (!uniqueIds.length) return;
  try {
    await inngest.send(
      uniqueIds.map((id) => ({ name, id: `${name}/${id}`, data: { id } })),
    );
  } catch {
    console.error(
      "Background trigger unavailable; scheduled recovery retained",
      {
        name,
      },
    );
  }
};
