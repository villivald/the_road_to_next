-- Access changes must serialize with reservations, including membership removals.
CREATE FUNCTION lock_membership_list() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  PERFORM 1 FROM "Wishlist" WHERE "id" = OLD."wishlistId" FOR UPDATE;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Membership_list_lock" BEFORE DELETE OR UPDATE OF "role" ON "Membership"
  FOR EACH ROW EXECUTE FUNCTION lock_membership_list();

CREATE FUNCTION end_reservations_after_list_access_change() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  UPDATE "Reservation" r SET "endedAt" = GREATEST(clock_timestamp(), r."createdAt")
  FROM "Wish" w
  WHERE r."wishId" = w."id" AND w."wishlistId" = NEW."id" AND r."endedAt" IS NULL
    AND (
      NEW."archivedAt" IS NOT NULL OR NEW."publication" = 'DRAFT'
      OR (NEW."visibility" = 'PRIVATE' AND NOT EXISTS (
        SELECT 1 FROM "Membership" m
        WHERE m."wishlistId" = NEW."id" AND m."userId" = r."userId"
      ))
    );
  RETURN NULL;
END;
$$;

CREATE TRIGGER "Wishlist_reservation_access" AFTER UPDATE OF "publication", "visibility", "archivedAt" ON "Wishlist"
  FOR EACH ROW EXECUTE FUNCTION end_reservations_after_list_access_change();

CREATE FUNCTION end_reservations_after_membership_removal() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  UPDATE "Reservation" r SET "endedAt" = GREATEST(clock_timestamp(), r."createdAt")
  FROM "Wish" w, "Wishlist" l
  WHERE r."wishId" = w."id" AND w."wishlistId" = l."id"
    AND l."id" = OLD."wishlistId" AND r."userId" = OLD."userId" AND r."endedAt" IS NULL
    AND (l."visibility" = 'PRIVATE' OR l."publication" = 'DRAFT' OR l."archivedAt" IS NOT NULL);
  RETURN NULL;
END;
$$;

CREATE TRIGGER "Membership_reservation_access" AFTER DELETE ON "Membership"
  FOR EACH ROW EXECUTE FUNCTION end_reservations_after_membership_removal();
