import { context, SpanKind, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  type ReadableSpan,
  SamplingDecision,
  type SpanProcessor,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { performanceSampleRate } from "./config";
import { logPerformanceMetric, type ServerMetric } from "./metrics";
import { normalizePerformanceRoute } from "./routes";

export const serverMetric = (
  span: Pick<
    ReadableSpan,
    "attributes" | "duration" | "kind" | "parentSpanContext"
  >,
): ServerMetric | null => {
  if (span.kind !== SpanKind.SERVER || span.parentSpanContext) return null;
  const attributes = span.attributes;
  if (attributes["next.span_type"] !== "BaseServer.handleRequest") return null;
  // Next can probe a handler before invoking the matched route. Those completed
  // probes have no http.route and must not become duplicate near-zero samples.
  if (typeof attributes["http.route"] !== "string") return null;
  const target = attributes["http.target"];
  const route =
    typeof target === "string" ? normalizePerformanceRoute(target) : null;
  const method = attributes["http.method"];
  const status = attributes["http.status_code"];
  const value = Math.round(span.duration[0] * 1000 + span.duration[1] / 1e6);
  if (
    !route ||
    (method !== "GET" && method !== "POST" && method !== "HEAD") ||
    typeof status !== "number" ||
    status < 100 ||
    status > 599 ||
    !Number.isFinite(value) ||
    value < 0
  )
    return null;
  return {
    source: "server" as const,
    route,
    name: "request" as const,
    value,
    method,
    status,
    transport:
      attributes["next.rsc"] === true
        ? ("rsc" as const)
        : ("document" as const),
  };
};

export const registerPerformanceMonitoring = () => {
  const rate = performanceSampleRate(process.env.PERFORMANCE_SAMPLE_RATE);
  const processor: SpanProcessor = {
    onStart() {},
    onEnd(span) {
      const metric = serverMetric(span);
      if (metric) logPerformanceMetric(metric);
    },
    async forceFlush() {},
    async shutdown() {},
  };
  const provider = new TracerProvider({
    sampler: {
      shouldSample(parentContext, _traceId, _name, kind, attributes) {
        const target = attributes["http.target"];
        return {
          decision:
            kind === SpanKind.SERVER &&
            !trace.getSpanContext(parentContext) &&
            typeof target === "string" &&
            normalizePerformanceRoute(target) &&
            Math.random() < rate
              ? SamplingDecision.RECORD
              : SamplingDecision.NOT_RECORD,
        };
      },
      toString: () => "WishlistRequestTimings",
    },
    spanProcessors: [processor],
    spanLimits: { eventCountLimit: 0, linkCountLimit: 0 },
  });
  if (trace.setGlobalTracerProvider(provider)) {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
  }
};
