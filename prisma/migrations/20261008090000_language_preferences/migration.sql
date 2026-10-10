ALTER TABLE "User" ADD COLUMN "locale" VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE "Invitation" ADD COLUMN "locale" VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD CONSTRAINT "User_locale_check" CHECK ("locale" IN ('en', 'fi'));
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_locale_check" CHECK ("locale" IN ('en', 'fi'));
