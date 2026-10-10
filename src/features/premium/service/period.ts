export type AccessPeriod = { startsAt: Date; expiresAt: Date };

// Only overlapping or adjoining periods extend current access. A future grant
// beyond a gap never makes the account premium ahead of its start date.
export const continuousPremiumUntil = (periods: AccessPeriod[], now: Date) => {
  const sorted = [...periods].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  let until = now.getTime();

  for (const period of sorted) {
    if (period.startsAt.getTime() > until) {
      break;
    }
    until = Math.max(until, period.expiresAt.getTime());
  }

  return until > now.getTime() ? new Date(until) : null;
};
