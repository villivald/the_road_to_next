CREATE TABLE "AccountEmail" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "grantId" TEXT,
    "recipient" VARCHAR(254) NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "deliveryFailedAt" TIMESTAMP(3),
    "claimId" TEXT,
    CONSTRAINT "AccountEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountEmail_key_key" ON "AccountEmail"("key");
CREATE INDEX "AccountEmail_sentAt_canceledAt_deliveryFailedAt_nextAttemptAt_idx" ON "AccountEmail"("sentAt", "canceledAt", "deliveryFailedAt", "nextAttemptAt");
CREATE INDEX "AccountEmail_userId_idx" ON "AccountEmail"("userId");
ALTER TABLE "AccountEmail" ADD CONSTRAINT "AccountEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
