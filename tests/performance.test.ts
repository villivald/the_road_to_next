import { SpanKind } from "@opentelemetry/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/performance/route";
import { performanceSampleRate } from "@/features/performance/config";
import { fieldMetricSchema } from "@/features/performance/metrics";
import { normalizePerformanceRoute } from "@/features/performance/routes";
import { serverMetric } from "@/features/performance/server";
import {
  percentiles,
  summarizePerformanceLogs,
} from "@/features/performance/summary";

const metric = {
  source: "field",
  route: "/lists/[id]",
  name: "LCP",
  value: 1234,
  device: "narrow",
};
const request = (
  body = JSON.stringify(metric),
  origin = "https://wishlist.example",
) =>
  new Request("https://wishlist.example/api/performance", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body,
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("private performance monitoring", () => {
  it("calculates nearest-rank percentiles and keeps lab, device and transport groups separate", () => {
    expect(percentiles([100, 1, 3, 2])).toEqual({
      count: 4,
      p50: 2,
      p75: 3,
      p95: 100,
    });
    expect(percentiles([])).toEqual({
      count: 0,
      p50: null,
      p75: null,
      p95: null,
    });
    const field = { kind: "wishlist-performance", ...metric };
    const server = {
      kind: "wishlist-performance",
      source: "server",
      route: "/browse",
      name: "request",
      value: 23,
      method: "GET",
      transport: "rsc",
      status: 200,
    };
    const result = summarizePerformanceLogs([
      JSON.stringify(field),
      JSON.stringify({ message: JSON.stringify(field) }),
      JSON.stringify({ ...field, device: "wide" }),
      JSON.stringify(server),
      JSON.stringify({ ...field, source: "lab" }),
      JSON.stringify({ ...server, token: "secret" }),
      "invalid",
    ]);
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]).toMatchObject({
      source: "field",
      count: 2,
      p75: 1234,
    });
    expect(result.groups[2]).toMatchObject({
      source: "server",
      status: "2xx",
      transport: "rsc",
      p95: 23,
    });
    expect(result.discardedLines).toBe(3);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it.each([
    ["/fi/lists/customer-123?q=private#secret", "/lists/[id]"],
    ["/en/lists/customer-123/wishes/private-456", "/lists/[id]/wishes/[id]"],
    ["/en/browse?q=secret&owner=person", "/browse"],
    ["/fi", "/"],
    ["/en/lists/shared", "/lists/shared"],
  ])("normalizes %s without retaining identifiers", (path, route) => {
    expect(normalizePerformanceRoute(path)).toBe(route);
  });

  it.each([
    "/fi/guest",
    "/fi/guest/lists/secret",
    "/api/guest",
    "/password-reset/token",
    "/en/password-reset/token",
    "/en/invitations/private",
    "/en/account/checkout",
    "/api/paddle/webhook",
    "/unknown/private",
    "https://example.com/browse",
    "//example.com/browse",
  ])("excludes %s", (path) => {
    expect(normalizePerformanceRoute(path)).toBeNull();
  });

  it("rejects extra fields, unnormalized routes and invalid numbers", () => {
    expect(fieldMetricSchema.safeParse(metric).success).toBe(true);
    for (const value of [
      { ...metric, url: "secret" },
      { ...metric, route: "/lists/customer" },
      { ...metric, value: -1 },
      { ...metric, value: Infinity },
      { ...metric, name: "CLS", value: 101 },
    ])
      expect(fieldMetricSchema.safeParse(value).success).toBe(false);
  });

  it("fails closed on invalid sample configuration", () => {
    expect(performanceSampleRate(undefined)).toBe(0.1);
    expect(performanceSampleRate("1")).toBe(1);
    for (const value of ["", "invalid", "2", "-1", "Infinity"])
      expect(performanceSampleRate(value)).toBe(0);
  });

  it("discards disabled monitoring and foreign-origin submissions without logging", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("PERFORMANCE_MONITORING", "0");
    expect((await POST(request())).status).toBe(204);
    vi.stubEnv("PERFORMANCE_MONITORING", "1");
    vi.stubEnv("APP_URL", "https://wishlist.example");
    expect(
      (await POST(request(undefined, "https://other.example"))).status,
    ).toBe(403);
    expect(log).not.toHaveBeenCalled();
  });

  it("logs only validated, bounded records and throttles each instance", async () => {
    vi.stubEnv("PERFORMANCE_MONITORING", "1");
    vi.stubEnv("APP_URL", "https://wishlist.example");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01"));
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request(" ".repeat(513)))).status).toBe(413);
    expect(
      (await POST(request(JSON.stringify({ ...metric, token: "secret" }))))
        .status,
    ).toBe(400);
    expect(log).not.toHaveBeenCalled();
    for (let index = 0; index < 120; index += 1)
      expect((await POST(request())).status).toBe(204);
    expect((await POST(request())).status).toBe(429);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      kind: "wishlist-performance",
      ...metric,
    });
    vi.advanceTimersByTime(60_000);
    expect((await POST(request())).status).toBe(204);
  });

  it("extracts root-request duration without exporting span attributes or errors", () => {
    const span = {
      kind: SpanKind.SERVER,
      attributes: {
        "next.span_type": "BaseServer.handleRequest",
        "http.route": "/[locale]/lists/[listId]",
        "http.target": "/fi/lists/private?q=secret",
        "http.method": "GET",
        "http.status_code": 200,
        "next.rsc": true,
        "error.message": "secret",
      },
      duration: [1, 250_000_000] as [number, number],
    };
    expect(serverMetric(span)).toEqual({
      source: "server",
      route: "/lists/[id]",
      name: "request",
      value: 1250,
      method: "GET",
      status: 200,
      transport: "rsc",
    });
    expect(
      serverMetric({
        ...span,
        attributes: { ...span.attributes, "http.route": undefined },
      }),
    ).toBeNull();
    expect(serverMetric({ ...span, kind: SpanKind.INTERNAL })).toBeNull();
    expect(
      serverMetric({
        ...span,
        parentSpanContext: {
          traceId: "0".repeat(32),
          spanId: "0".repeat(16),
          traceFlags: 0,
        },
      }),
    ).toBeNull();
    expect(
      serverMetric({
        ...span,
        attributes: {
          ...span.attributes,
          "http.target": "/fi/guest?token=secret",
        },
      }),
    ).toBeNull();
    expect(
      serverMetric({
        ...span,
        attributes: { ...span.attributes, "next.span_type": "database" },
      }),
    ).toBeNull();
  });
});
