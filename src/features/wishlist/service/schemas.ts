import { z } from "zod";
import { listThemeIds } from "@/features/premium/themes";

export const wishlistIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const wishlistSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title")
    .max(200, "Use at most 200 characters"),
  description: z.string().trim().max(2000, "Use at most 2,000 characters"),
  reservationsEnabled: z.boolean(),
  theme: z.enum(listThemeIds).optional(),
});

export const publicationSchema = z.enum(["DRAFT", "PUBLISHED"]);
