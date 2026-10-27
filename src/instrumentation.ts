export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.PERFORMANCE_MONITORING === "1"
  ) {
    const { registerPerformanceMonitoring } =
      await import("@/features/performance/server");
    registerPerformanceMonitoring();
  }
}
