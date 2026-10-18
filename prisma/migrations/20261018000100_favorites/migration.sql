-- CreateTable
CREATE TABLE "FavoriteList" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,

    CONSTRAINT "FavoriteList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteWish" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "wishId" TEXT NOT NULL,

    CONSTRAINT "FavoriteWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoritePerson" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FavoritePerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteList_userId_createdAt_id_idx" ON "FavoriteList"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FavoriteList_wishlistId_idx" ON "FavoriteList"("wishlistId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteList_userId_wishlistId_key" ON "FavoriteList"("userId", "wishlistId");

-- CreateIndex
CREATE INDEX "FavoriteWish_userId_createdAt_id_idx" ON "FavoriteWish"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FavoriteWish_wishId_idx" ON "FavoriteWish"("wishId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWish_userId_wishId_key" ON "FavoriteWish"("userId", "wishId");

-- CreateIndex
CREATE INDEX "FavoritePerson_userId_createdAt_id_idx" ON "FavoritePerson"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FavoritePerson_personId_idx" ON "FavoritePerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoritePerson_userId_personId_key" ON "FavoritePerson"("userId", "personId");

-- AddForeignKey
ALTER TABLE "FavoriteList" ADD CONSTRAINT "FavoriteList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteList" ADD CONSTRAINT "FavoriteList_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWish" ADD CONSTRAINT "FavoriteWish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWish" ADD CONSTRAINT "FavoriteWish_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePerson" ADD CONSTRAINT "FavoritePerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePerson" ADD CONSTRAINT "FavoritePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

