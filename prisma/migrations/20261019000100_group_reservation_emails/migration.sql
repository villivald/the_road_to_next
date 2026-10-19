CREATE TYPE "GroupEmailKind" AS ENUM ('INVITED', 'ACCEPTED');

ALTER TABLE "AccountEmail"
  ADD COLUMN "groupParticipantId" TEXT,
  ADD COLUMN "groupEmailKind" "GroupEmailKind",
  ADD CONSTRAINT "AccountEmail_groupParticipantId_fkey"
    FOREIGN KEY ("groupParticipantId") REFERENCES "ReservationParticipant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountEmail_group_scope_check"
    CHECK (("groupParticipantId" IS NULL) = ("groupEmailKind" IS NULL));

CREATE INDEX "AccountEmail_groupParticipantId_idx" ON "AccountEmail"("groupParticipantId");
