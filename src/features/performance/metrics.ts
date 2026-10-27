import { z } from "zod";
import { performanceRoutes } from "./routes";

export const fieldMetricSchema = z
  .strictObject({
    source: z.literal("field"),
    route: z.string().refine((route) => performanceRoutes.includes(route)),
    name: z.enum(["LCP", "INP", "CLS", "TTFB", "FCP"]),
    value: z.number().finite().min(0).max(300_000),
    device: z.enum(["narrow", "wide"]),
  })
  .refine(({ name, value }) => name !== "CLS" || value <= 100);

export type FieldMetric = z.infer<typeof fieldMetricSchema>;

export type ServerMetric = {
  source: "server";
  route: string;
  name: "request";
  value: number;
  method: "GET" | "POST" | "HEAD";
  status: number;
  transport: "document" | "rsc";
};

export const logPerformanceMetric = (metric: FieldMetric | ServerMetric) => {
  // Constructed records only: never spread request, span, error or metric objects.
  console.info(JSON.stringify({ kind: "wishlist-performance", ...metric }));
};
