ALTER TABLE "User" ADD COLUMN "showPremiumBadge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Wishlist" ADD COLUMN "theme" VARCHAR(20) NOT NULL DEFAULT 'classic';
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_theme_check"
  CHECK ("theme" IN ('classic', 'botanical', 'festive', 'minimal', 'birthday', 'wedding', 'playful'));
