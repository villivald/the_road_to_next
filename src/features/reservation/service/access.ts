import type { Prisma } from "@/generated/prisma/client";

// Used only after independently checking list and wish access. An invitation
// does not make the general wish/media predicates readable.
export const participantReservation = (
  userId: string,
): Prisma.ReservationWhereInput => ({
  endedAt: null,
  OR: [
    { userId, user: { emailVerified: true } },
    {
      groupEnabled: true,
      participants: {
        some: { userId, status: "ACCEPTED", user: { emailVerified: true } },
      },
    },
  ],
});
