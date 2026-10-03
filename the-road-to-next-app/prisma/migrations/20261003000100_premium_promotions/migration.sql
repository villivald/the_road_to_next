CREATE TABLE "PromoCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "label" VARCHAR(80) NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL UNIQUE,
  "durationDays" INTEGER NOT NULL,
  "maxRedemptions" INTEGER NOT NULL,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PromoCode_duration_range" CHECK ("durationDays" BETWEEN 1 AND 365),
  CONSTRAINT "PromoCode_usage_range" CHECK ("maxRedemptions" BETWEEN 1 AND 10000 AND "redemptionCount" BETWEEN 0 AND "maxRedemptions"),
  CONSTRAINT "PromoCode_hash_format" CHECK ("codeHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "PromoCode_label_not_blank" CHECK (length(trim("label")) > 0),
  CONSTRAINT "PromoCode_expiry_after_creation" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "PromoRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "promoCodeId" TEXT NOT NULL REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");
CREATE INDEX "PromoRedemption_userId_idx" ON "PromoRedemption"("userId");

CREATE TABLE "PremiumGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "promoRedemptionId" TEXT UNIQUE REFERENCES "PromoRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PremiumGrant_positive_period" CHECK ("expiresAt" > "startsAt")
);
CREATE INDEX "PremiumGrant_userId_revokedAt_expiresAt_idx" ON "PremiumGrant"("userId", "revokedAt", "expiresAt");
