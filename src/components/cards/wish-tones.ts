export const wishTones = ["butter", "lilac", "sage"] as const;
export type WishTone = (typeof wishTones)[number];

const hashId = (id: string) => {
  let hash = 2166136261;
  for (const character of id)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
};

export const wishTone = (id: string): WishTone => wishTones[hashId(id) % 3];

// Balance the collection in stable ID order. Each choice uses the ID hash,
// varies successive groups, and never depends on render timing.
// Sorting keeps colours stable; filtering can rebalance the collection.
export const createWishTones = (
  ids: readonly string[],
): Record<string, WishTone> => {
  const counts = { butter: 0, lilac: 0, sage: 0 };
  let previousGroupStart: WishTone | undefined;
  return Object.fromEntries(
    [...new Set(ids)].sort().map((id, index) => {
      const minimum = Math.min(...Object.values(counts));
      const available = wishTones.filter((tone) => counts[tone] === minimum);
      const varied =
        index % wishTones.length === 0
          ? available.filter((tone) => tone !== previousGroupStart)
          : available;
      const tone = varied[hashId(id) % varied.length];
      counts[tone] += 1;
      if (index % wishTones.length === 0) previousGroupStart = tone;
      return [id, tone];
    }),
  );
};
