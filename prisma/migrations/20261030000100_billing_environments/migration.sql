CREATE TYPE "BillingEnvironment" AS ENUM ('sandbox', 'live');

-- Existing billing history was created exclusively against the sandbox API.
ALTER TABLE "BillingAccount" ADD COLUMN "environment" "BillingEnvironment" NOT NULL DEFAULT 'sandbox';
ALTER TABLE "BillingEvent" ADD COLUMN "environment" "BillingEnvironment" NOT NULL DEFAULT 'sandbox';

DROP INDEX "BillingAccount_userId_key";
DROP INDEX "BillingAccount_customerId_key";
DROP INDEX "BillingAccount_nextSyncAt_idx";
DROP INDEX "BillingEvent_processedAt_nextAttemptAt_idx";
CREATE UNIQUE INDEX "BillingAccount_userId_environment_key" ON "BillingAccount"("userId", "environment");
CREATE UNIQUE INDEX "BillingAccount_customerId_environment_key" ON "BillingAccount"("customerId", "environment");
CREATE INDEX "BillingAccount_environment_nextSyncAt_idx" ON "BillingAccount"("environment", "nextSyncAt");
CREATE INDEX "BillingEvent_environment_processedAt_nextAttemptAt_idx" ON "BillingEvent"("environment", "processedAt", "nextAttemptAt");
