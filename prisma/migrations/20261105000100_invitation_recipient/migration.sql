-- Keep account invitations bound to the selected person without exposing their email.
ALTER TABLE "Invitation" ADD COLUMN "recipientId" TEXT;

CREATE INDEX "Invitation_recipientId_idx" ON "Invitation"("recipientId");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
