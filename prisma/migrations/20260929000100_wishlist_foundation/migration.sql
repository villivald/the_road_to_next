-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Publication" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'GBP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "publication" "Publication" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ListVisibility" NOT NULL DEFAULT 'PUBLIC',
    "reservationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "ownerId" TEXT,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "wishlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "externalUrl" VARCHAR(2048),
    "priceMinor" INTEGER,
    "currency" "Currency",
    "priority" SMALLINT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "fulfilledAt" TIMESTAMP(3),
    "wishlistId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "wishId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "Wishlist_ownerId_archivedAt_createdAt_idx" ON "Wishlist"("ownerId", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Wishlist_visibility_publication_archivedAt_createdAt_idx" ON "Wishlist"("visibility", "publication", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Membership_userId_joinedAt_idx" ON "Membership"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_wishlistId_userId_key" ON "Membership"("wishlistId", "userId");

-- CreateIndex
CREATE INDEX "Wish_wishlistId_hidden_fulfilledAt_createdAt_idx" ON "Wish"("wishlistId", "hidden", "fulfilledAt", "createdAt");

-- CreateIndex
CREATE INDEX "Wish_authorId_idx" ON "Wish"("authorId");

-- CreateIndex
CREATE INDEX "Reservation_wishId_endedAt_idx" ON "Reservation"("wishId", "endedAt");

-- CreateIndex
CREATE INDEX "Reservation_userId_endedAt_createdAt_idx" ON "Reservation"("userId", "endedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Domain invariants that Prisma cannot express directly.
CREATE UNIQUE INDEX "Reservation_one_active_per_wish" ON "Reservation" ("wishId") WHERE "endedAt" IS NULL;
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_price_pair" CHECK (
  ("priceMinor" IS NULL AND "currency" IS NULL) OR
  ("priceMinor" IS NOT NULL AND "priceMinor" >= 0 AND "currency" IS NOT NULL)
);
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_priority_range" CHECK ("priority" BETWEEN 1 AND 5);
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_active_owner" CHECK ("archivedAt" IS NOT NULL OR "ownerId" IS NOT NULL);
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_title_not_blank" CHECK (length(trim("title")) > 0);
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_title_not_blank" CHECK (length(trim("title")) > 0);
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_end_after_start" CHECK ("endedAt" IS NULL OR "endedAt" >= "createdAt");
ALTER TABLE "User" ADD CONSTRAINT "User_normalized_email" CHECK ("email" = lower(trim("email")));

-- Validate at commit so a list and its owner's membership can be created together.
CREATE FUNCTION check_list_owner_admin() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE target_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'Wishlist' THEN
    target_id := NEW."id";
  ELSE
    target_id := COALESCE(NEW."wishlistId", OLD."wishlistId");
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Wishlist" l WHERE l."id" = target_id AND l."archivedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."wishlistId" = l."id"
      AND m."userId" = l."ownerId" AND m."role" = 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'An active list requires an owner with admin membership' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "Wishlist_owner_admin" AFTER INSERT OR UPDATE ON "Wishlist"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_list_owner_admin();
CREATE CONSTRAINT TRIGGER "Membership_owner_protection" AFTER INSERT OR UPDATE OR DELETE ON "Membership"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_list_owner_admin();
