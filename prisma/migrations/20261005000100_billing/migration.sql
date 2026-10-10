ALTER TABLE "PremiumGrant" ADD COLUMN "billingPaymentId" TEXT;

-- CreateTable
CREATE TABLE "BillingAccount" (
    "customerId" TEXT,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCheckout" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "priceId" TEXT NOT NULL,
    "transactionId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "nextBilledAt" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_userId_key" ON "BillingAccount"("userId");

-- CreateIndex
CREATE INDEX "BillingAccount_nextSyncAt_idx" ON "BillingAccount"("nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCheckout_transactionId_key" ON "BillingCheckout"("transactionId");

-- CreateIndex
CREATE INDEX "BillingCheckout_accountId_closedAt_idx" ON "BillingCheckout"("accountId", "closedAt");

-- CreateIndex
CREATE INDEX "BillingSubscription_accountId_idx" ON "BillingSubscription"("accountId");

-- CreateIndex
CREATE INDEX "BillingEvent_processedAt_nextAttemptAt_idx" ON "BillingEvent"("processedAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "PremiumGrant" ADD CONSTRAINT "PremiumGrant_billingPaymentId_fkey" FOREIGN KEY ("billingPaymentId") REFERENCES "BillingPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PremiumGrant_billingPaymentId_key" ON "PremiumGrant"("billingPaymentId");
ALTER TABLE "PremiumGrant" ADD CONSTRAINT "PremiumGrant_one_source" CHECK ("promoRedemptionId" IS NULL OR "billingPaymentId" IS NULL);
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_interval" CHECK ("interval" IN ('month', 'year'));
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_period" CHECK ("expiresAt" > "startsAt");
CREATE UNIQUE INDEX "BillingCheckout_one_pending" ON "BillingCheckout"("accountId") WHERE "closedAt" IS NULL;

CREATE UNIQUE INDEX "BillingAccount_customerId_key" ON "BillingAccount"("customerId");
