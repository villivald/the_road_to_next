import { fieldMetricSchema } from "./metrics";
import { performanceRoutes } from "./routes";

export const percentiles = (values: number[]) => {
  const sorted = values.toSorted((first, second) => first - second);
  const percentile = (fraction: number) =>
    sorted.length
      ? Math.round(sorted[Math.ceil(sorted.length * fraction) - 1] * 10_000) /
        10_000
      : null;
  return {
    count: sorted.length,
    p50: percentile(0.5),
    p75: percentile(0.75),
    p95: percentile(0.95),
  };
};

export const parsePerformanceLog = (line: string) => {
  try {
    let record = JSON.parse(line);
    // Vercel JSONL wraps application output in a message field.
    if (typeof record.message === "string") record = JSON.parse(record.message);
    if (record.kind !== "wishlist-performance") return null;
    const { kind: _kind, ...metric } = record;
    if (metric.source === "field") {
      const validated = fieldMetricSchema.safeParse(metric);
      return validated.success ? validated.data : null;
    }
    if (
      metric.source !== "server" ||
      !performanceRoutes.includes(metric.route) ||
      metric.name !== "request" ||
      !Number.isFinite(metric.value) ||
      metric.value < 0 ||
      !["GET", "HEAD", "POST"].includes(metric.method) ||
      !["document", "rsc"].includes(metric.transport) ||
      !Number.isInteger(metric.status) ||
      metric.status < 100 ||
      metric.status > 599 ||
      Object.keys(metric).sort().join(",") !==
        "method,name,route,source,status,transport,value"
    )
      return null;
    return {
      source: "server" as const,
      route: String(metric.route),
      name: "request" as const,
      method: String(metric.method),
      transport: String(metric.transport),
      status: Number(metric.status),
      value: Number(metric.value),
    };
  } catch {
    return null;
  }
};

export const summarizePerformanceLogs = (lines: Iterable<string>) => {
  const groups = new Map<
    string,
    { labels: Record<string, string>; values: number[] }
  >();
  let discardedLines = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const metric = parsePerformanceLog(line);
    if (!metric) {
      discardedLines += 1;
      continue;
    }
    const labels: Record<string, string> =
      metric.source === "field"
        ? {
            source: metric.source,
            route: metric.route,
            name: metric.name,
            device: metric.device,
          }
        : {
            source: metric.source,
            route: metric.route,
            name: metric.name,
            method: metric.method,
            transport: metric.transport,
            status: `${Math.floor(metric.status / 100)}xx`,
          };
    const key = JSON.stringify(labels);
    const group = groups.get(key) ?? { labels, values: [] };
    group.values.push(metric.value);
    groups.set(key, group);
  }
  return {
    discardedLines,
    groups: [...groups.values()].map(({ labels, values }) => ({
      ...labels,
      ...percentiles(values),
    })),
  };
};
