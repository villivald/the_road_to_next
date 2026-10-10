CREATE TYPE "MediaProvider" AS ENUM ('LOCAL', 'VERCEL');
CREATE TYPE "MediaState" AS ENUM ('PENDING', 'READY', 'DELETING');

CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pathname" TEXT NOT NULL UNIQUE,
    "provider" "MediaProvider" NOT NULL,
    "state" "MediaState" NOT NULL DEFAULT 'PENDING',
    "alt" VARCHAR(300) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "cleanupAfter" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "wishlistId" TEXT UNIQUE REFERENCES "Wishlist"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "wishId" TEXT UNIQUE REFERENCES "Wish"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "userId" TEXT UNIQUE REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Media_single_target" CHECK (
        num_nonnulls("wishlistId", "wishId", "userId") <= 1
        AND ("state" = 'READY' OR num_nonnulls("wishlistId", "wishId", "userId") = 0)
    ),
    CONSTRAINT "Media_dimensions" CHECK ("width" > 0 AND "height" > 0 AND "bytes" > 0)
);

CREATE INDEX "Media_cleanupAfter_idx" ON "Media"("cleanupAfter");
