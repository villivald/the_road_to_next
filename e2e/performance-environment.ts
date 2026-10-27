import { testEnvironment } from "./environment";

export const performanceDatabaseUrl =
  "postgresql://wishlist_test:wishlist-test-only@127.0.0.1:55433/wishlist_test?schema=performance";
export const performanceEnvironment = {
  ...testEnvironment,
  DATABASE_URL: performanceDatabaseUrl,
  DIRECT_URL: performanceDatabaseUrl,
  PERFORMANCE_MONITORING: "1",
  PERFORMANCE_SAMPLE_RATE: "1",
};

export const assertPerformanceDatabase = (
  environment: Readonly<Record<string, string | undefined>>,
) => {
  if (
    environment.DATABASE_URL !== performanceDatabaseUrl ||
    environment.DIRECT_URL !== performanceDatabaseUrl
  )
    throw new Error(
      "Performance setup is restricted to the isolated wishlist_test database and performance schema. Use npm run performance:lab.",
    );
};
