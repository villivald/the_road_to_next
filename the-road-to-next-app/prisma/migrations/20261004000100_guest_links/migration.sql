CREATE TABLE "GuestLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "label" VARCHAR(80) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "wishlistId" TEXT NOT NULL REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GuestLink_hash_format" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "GuestLink_label_not_blank" CHECK (length(trim("label")) > 0),
  CONSTRAINT "GuestLink_positive_validity" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "GuestLink_wishlistId_createdAt_idx" ON "GuestLink"("wishlistId", "createdAt");
