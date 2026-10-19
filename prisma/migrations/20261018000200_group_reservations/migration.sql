ALTER TABLE "Reservation" ADD COLUMN "groupEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TYPE "ReservationParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'LEFT');
CREATE TABLE "ReservationParticipant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "status" "ReservationParticipantStatus" NOT NULL DEFAULT 'PENDING',
  "reservationId" TEXT NOT NULL REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "inviterId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReservationParticipant_reservationId_userId_key" ON "ReservationParticipant"("reservationId", "userId");
CREATE INDEX "ReservationParticipant_userId_status_createdAt_idx" ON "ReservationParticipant"("userId", "status", "createdAt");
CREATE INDEX "ReservationParticipant_inviterId_idx" ON "ReservationParticipant"("inviterId");
ALTER TABLE "ReservationParticipant" ADD CONSTRAINT "ReservationParticipant_acceptance" CHECK ("status" <> 'ACCEPTED' OR "acceptedAt" IS NOT NULL);

-- Access loss is permanent. Only the affected people leave; a remaining accepted
-- participant becomes organizer before the old organizer loses access or is deleted.
CREATE FUNCTION reconcile_reservation_groups(list_id TEXT, excluded_user TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE current_reservation RECORD; successor TEXT;
BEGIN
  PERFORM 1 FROM "Wishlist" WHERE "id" = list_id FOR UPDATE;
  UPDATE "ReservationParticipant" p SET "status" = 'REVOKED'
  FROM "Reservation" r, "Wish" w, "Wishlist" l
  WHERE p."reservationId" = r."id" AND r."wishId" = w."id" AND w."wishlistId" = l."id"
    AND l."id" = list_id AND r."endedAt" IS NULL AND p."status" IN ('PENDING', 'ACCEPTED')
    AND (p."userId" = excluded_user OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = p."userId" AND u."emailVerified")
      OR (l."visibility" = 'PRIVATE' AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."wishlistId" = l."id" AND m."userId" = p."userId")));
  FOR current_reservation IN
    SELECT r."id", r."groupEnabled", l."publication", l."archivedAt", w."hidden", w."fulfilledAt"
    FROM "Reservation" r JOIN "Wish" w ON w."id" = r."wishId" JOIN "Wishlist" l ON l."id" = w."wishlistId"
    WHERE l."id" = list_id AND r."endedAt" IS NULL AND (
      l."archivedAt" IS NOT NULL OR l."publication" = 'DRAFT' OR w."hidden" OR w."fulfilledAt" IS NOT NULL
      OR r."userId" = excluded_user OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = r."userId" AND u."emailVerified")
      OR (l."visibility" = 'PRIVATE' AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."wishlistId" = l."id" AND m."userId" = r."userId")))
    ORDER BY r."id"
  LOOP
    successor := NULL;
    IF current_reservation."groupEnabled" AND current_reservation."publication" = 'PUBLISHED' AND current_reservation."archivedAt" IS NULL AND NOT current_reservation."hidden" AND current_reservation."fulfilledAt" IS NULL THEN
      SELECT p."userId" INTO successor FROM "ReservationParticipant" p
      WHERE p."reservationId" = current_reservation."id" AND p."status" = 'ACCEPTED'
      ORDER BY p."acceptedAt", p."id" LIMIT 1;
    END IF;
    IF successor IS NOT NULL THEN
      UPDATE "Reservation" SET "userId" = successor WHERE "id" = current_reservation."id";
      UPDATE "ReservationParticipant" SET "status" = 'LEFT' WHERE "reservationId" = current_reservation."id" AND "userId" = successor;
      -- Pending invitations were issued by the previous coordinator. Do not
      -- silently substitute a different inviter or revive them after transfer.
      UPDATE "ReservationParticipant" SET "status" = 'REVOKED' WHERE "reservationId" = current_reservation."id" AND "status" = 'PENDING';
    ELSE
      UPDATE "Reservation" SET "endedAt" = GREATEST(clock_timestamp(), "createdAt") WHERE "id" = current_reservation."id";
    END IF;
  END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION end_reservations_after_list_access_change() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  PERFORM reconcile_reservation_groups(NEW."id");
  RETURN NULL;
END;
$$;
CREATE OR REPLACE FUNCTION end_reservations_after_membership_removal() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  PERFORM reconcile_reservation_groups(OLD."wishlistId");
  RETURN NULL;
END;
$$;
CREATE FUNCTION close_reservation_participants() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF NEW."endedAt" IS NOT NULL THEN
    UPDATE "ReservationParticipant" SET "status" = 'REVOKED'
      WHERE "reservationId" = NEW."id" AND "status" IN ('PENDING', 'ACCEPTED');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "Reservation_close_group" AFTER UPDATE OF "endedAt" ON "Reservation"
FOR EACH ROW EXECUTE FUNCTION close_reservation_participants();
CREATE FUNCTION reconcile_groups_after_wish_change() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  PERFORM reconcile_reservation_groups(NEW."wishlistId");
  RETURN NULL;
END;
$$;
CREATE TRIGGER "Wish_group_lifecycle" AFTER UPDATE OF "hidden", "fulfilledAt" ON "Wish"
FOR EACH ROW EXECUTE FUNCTION reconcile_groups_after_wish_change();
CREATE FUNCTION reconcile_groups_for_user() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE list_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' OR NOT NEW."emailVerified" THEN
    FOR list_id IN SELECT DISTINCT w."wishlistId" FROM "Wish" w JOIN "Reservation" r ON r."wishId" = w."id"
      WHERE r."endedAt" IS NULL AND (r."userId" = OLD."id" OR EXISTS (
        SELECT 1 FROM "ReservationParticipant" p WHERE p."reservationId" = r."id" AND p."userId" = OLD."id")) ORDER BY w."wishlistId"
    LOOP
      PERFORM reconcile_reservation_groups(list_id, OLD."id");
    END LOOP;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "User_group_deletion" BEFORE DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION reconcile_groups_for_user();
CREATE TRIGGER "User_group_verification" AFTER UPDATE OF "emailVerified" ON "User" FOR EACH ROW EXECUTE FUNCTION reconcile_groups_for_user();
