export const performanceSampleRate = (value: string | undefined) => {
  if (value === undefined) return 0.1;
  const rate = Number(value);
  return value.trim() && Number.isFinite(rate) && rate >= 0 && rate <= 1
    ? rate
    : 0;
};
