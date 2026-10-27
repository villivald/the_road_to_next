import { describe, expect, it } from "vitest";
import { assertTestDatabase, testEnvironment } from "../e2e/environment";
import {
  assertPerformanceDatabase,
  performanceEnvironment,
} from "../e2e/performance-environment";

describe("browser-test database isolation", () => {
  it("keeps capacity fixtures separate from the regular browser schema", () => {
    expect(() =>
      assertPerformanceDatabase(performanceEnvironment),
    ).not.toThrow();
    expect(() => assertPerformanceDatabase(testEnvironment)).toThrow(
      "performance schema",
    );
    expect(() => assertTestDatabase(performanceEnvironment)).toThrow(
      "wishlist schema",
    );
    expect(() =>
      assertPerformanceDatabase({
        ...performanceEnvironment,
        DATABASE_URL: performanceEnvironment.DATABASE_URL.replace(
          "127.0.0.1",
          "remote.example",
        ),
      }),
    ).toThrow();
    expect(() =>
      assertPerformanceDatabase({
        ...performanceEnvironment,
        DIRECT_URL: "postgresql://localhost/wishlist_dev",
      }),
    ).toThrow();
  });
  it("accepts only the dedicated test target for both runtime and schema operations", () => {
    expect(() => assertTestDatabase(testEnvironment)).not.toThrow();
  });

  it.each([
    {},
    {
      ...testEnvironment,
      DATABASE_URL: "postgresql://localhost:5432/ticketbounty",
    },
    {
      ...testEnvironment,
      DIRECT_URL: "postgresql://localhost:55432/wishlist_dev",
    },
    {
      ...testEnvironment,
      DATABASE_URL: testEnvironment.DATABASE_URL.replace(
        "127.0.0.1",
        "remote.example",
      ),
    },
  ])(
    "refuses missing, development, or remote database targets",
    (environment) => {
      expect(() => assertTestDatabase(environment)).toThrow(
        "isolated wishlist_test",
      );
    },
  );
});
