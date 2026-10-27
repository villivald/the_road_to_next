import {
  fieldMetricSchema,
  logPerformanceMetric,
} from "@/features/performance/metrics";

const response = (status: number) =>
  new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

// Bound logging within each server instance without database reads, IPs or cookies.
let windowStart = 0;
let accepted = 0;

export async function POST(request: Request) {
  if (process.env.PERFORMANCE_MONITORING !== "1") return response(204);
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL ?? request.url).origin
  )
    return response(403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response(415);
  const reader = request.body?.getReader();
  if (!reader) return response(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512) {
        await reader.cancel();
        return response(413);
      }
      chunks.push(value);
    }
    const metric = fieldMetricSchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!metric.success) return response(400);
    const now = Date.now();
    if (now - windowStart >= 60_000) {
      windowStart = now;
      accepted = 0;
    }
    if (accepted >= 120) return response(429);
    accepted += 1;
    logPerformanceMetric(metric.data);
    return response(204);
  } catch {
    return response(400);
  } finally {
    reader.releaseLock();
  }
}
