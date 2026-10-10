-- Memberships belong to one account and one list for their lifetime.
-- Role changes remain allowed; ownership checks run at transaction commit.
CREATE FUNCTION protect_membership_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."wishlistId" IS DISTINCT FROM OLD."wishlistId" OR NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    RAISE EXCEPTION 'Membership identity cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Membership_identity_immutable" BEFORE UPDATE ON "Membership"
  FOR EACH ROW EXECUTE FUNCTION protect_membership_identity();
