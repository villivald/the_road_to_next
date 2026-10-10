import { z } from "zod";

export const guestTokenSchema = z.string().regex(/^[a-z2-7]{32}$/);
export const guestLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Enter a label")
    .max(80, "Use at most 80 characters"),
  days: z.coerce.number().int().min(1).max(30),
});
