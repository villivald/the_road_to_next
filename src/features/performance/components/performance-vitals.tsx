"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useCallback, useRef } from "react";
import { normalizePerformanceRoute } from "../routes";

export function PerformanceVitals({ sampleRate }: { sampleRate: number }) {
  const documentSample = useRef<{
    route: string | null;
    sent: Set<string>;
  } | null>(null);
  const report = useCallback(
    (metric: { name: string; value: number }) => {
      if (!documentSample.current) {
        const navigation = performance.getEntriesByType("navigation")[0];
        const path = navigation ? new URL(navigation.name).pathname : null;
        documentSample.current = {
          route:
            path &&
            Math.random() < sampleRate &&
            navigator.doNotTrack !== "1" &&
            !(navigator as Navigator & { globalPrivacyControl?: boolean })
              .globalPrivacyControl
              ? normalizePerformanceRoute(path)
              : null,
          sent: new Set(),
        };
      }
      const { route, sent } = documentSample.current;
      if (
        !route ||
        !normalizePerformanceRoute(location.pathname) ||
        sent.has(metric.name) ||
        !["LCP", "INP", "CLS", "TTFB", "FCP"].includes(metric.name)
      )
        return;
      sent.add(metric.name);
      const value =
        metric.name === "CLS"
          ? Math.round(metric.value * 10_000) / 10_000
          : Math.round(metric.value);
      void fetch("/api/performance", {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "field",
          route,
          name: metric.name,
          value,
          device: matchMedia("(max-width: 767px)").matches ? "narrow" : "wide",
        }),
      }).catch(() => {});
    },
    [sampleRate],
  );
  useReportWebVitals(report);
  return null;
}
