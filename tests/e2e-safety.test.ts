import { describe, expect, it } from "vitest";
import { assertTestDatabase, testEnvironment } from "../e2e/environment";

describe("browser-test database isolation", () => {
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
