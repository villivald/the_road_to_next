import { eventType, Inngest, staticSchema } from "inngest";

export const passwordResetRequested = eventType("app/auth.password-reset", {
  schema: staticSchema<{ userId: string }>(),
});

export const signedUp = eventType("app/auth.sign-up", {
  schema: staticSchema<{ userId: string }>(),
});

export const inngest = new Inngest({ id: "wishlist", checkpointing: false });
