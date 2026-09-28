export const testDatabaseUrl =
  "postgresql://wishlist_test:wishlist-test-only@127.0.0.1:55433/wishlist_test?schema=public";

export const testOrigin = "http://127.0.0.1:3017";

export const testEnvironment = {
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: testDatabaseUrl,
  APP_URL: testOrigin,
  INNGEST_DEV: "1",
  INNGEST_BASE_URL: "http://127.0.0.1:8289",
  INNGEST_EVENT_KEY: "",
  INNGEST_SIGNING_KEY: "",
  RESEND_API_KEY: "re_e2e_not_a_real_key",
  EMAIL_FROM: "Wishlist Tests <noreply@example.test>",
  AWS_REGION: "eu-north-1",
  AWS_ACCESS_KEY: "e2e-not-a-real-key",
  AWS_SECRET_KEY: "e2e-not-a-real-secret",
  AWS_BUCKET_NAME: "wishlist-e2e-unused",
};

export const assertTestDatabase = (
  environment: Readonly<Record<string, string | undefined>>,
) => {
  if (
    environment.DATABASE_URL !== testDatabaseUrl ||
    environment.DIRECT_URL !== testDatabaseUrl
  ) {
    throw new Error(
      "Database setup is restricted to the isolated wishlist_test database. Use npm run test:e2e.",
    );
  }
};
