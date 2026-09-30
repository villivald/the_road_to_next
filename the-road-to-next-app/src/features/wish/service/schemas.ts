import { z } from "zod";
import { currencies, parsePriceMinor } from "../utils/money";

const externalUrlSchema = z
  .string()
  .trim()
  .max(2048, "Use a link no longer than 2,048 characters")
  .default("")
  .refine((value) => {
    if (!value) {
      return true;
    }

    try {
      const url = new URL(value);

      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.href.length <= 2048 &&
        !/[\u0000-\u001f\u007f]/.test(value)
      );
    } catch {
      return false;
    }
  }, "Enter a full HTTP or HTTPS link without login details");

const priceSchema = z
  .string()
  .trim()
  .max(20, "Enter a valid price")
  .default("")
  .superRefine((value, context) => {
    try {
      parsePriceMinor(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Enter a valid price",
      });
    }
  });

export const wishSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a title")
      .max(200, "Use at most 200 characters"),
    description: z
      .string()
      .trim()
      .max(4000, "Use at most 4,000 characters")
      .default(""),
    externalUrl: externalUrlSchema,
    price: priceSchema,
    currency: z.enum(["", ...currencies]).default(""),
    priority: z.enum(["", "1", "2", "3", "4", "5"]).default(""),
    hidden: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.price && !value.currency) {
      context.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Choose a currency for this price",
      });
    }
  })
  .transform((value) => ({
    title: value.title,
    description: value.description || null,
    externalUrl: value.externalUrl ? new URL(value.externalUrl).href : null,
    priceMinor: parsePriceMinor(value.price),
    currency: value.price && value.currency ? value.currency : null,
    priority: value.priority ? Number(value.priority) : null,
    hidden: value.hidden,
  }));

export const wishTransitionSchema = z.enum([
  "hide",
  "unhide",
  "fulfill",
  "reopen",
]);

export const wishSortSchema = z
  .enum(["newest", "oldest", "priority", "title"])
  .catch("newest");

export const wishViewSchema = z.enum(["current", "fulfilled"]).catch("current");
