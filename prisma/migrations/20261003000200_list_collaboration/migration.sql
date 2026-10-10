CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "wishlistId" TEXT NOT NULL REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "inviterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sentAt" TIMESTAMP(3),
  "firstAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
  "deliveryFailedAt" TIMESTAMP(3),
  "claimId" TEXT,
  CONSTRAINT "Invitation_normalized_email" CHECK ("email" = lower(trim("email"))),
  CONSTRAINT "Invitation_positive_validity" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "Invitation_attempts_nonnegative" CHECK ("deliveryAttempts" >= 0)
);
CREATE UNIQUE INDEX "Invitation_one_pending_email" ON "Invitation"("wishlistId", "email")
  WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
CREATE INDEX "Invitation_wishlistId_createdAt_idx" ON "Invitation"("wishlistId", "createdAt");
CREATE INDEX "Invitation_inviterId_idx" ON "Invitation"("inviterId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Invitation_sentAt_nextAttemptAt_idx" ON "Invitation"("sentAt", "nextAttemptAt");
