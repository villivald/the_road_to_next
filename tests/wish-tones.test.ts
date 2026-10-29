import { expect, it } from "vitest";
import { createWishTones, wishTones } from "@/components/cards/wish-tones";

it("uses a balanced palette even for small collections", () => {
  for (const size of [3, 7, 20, 60]) {
    const tones = Object.values(
      createWishTones(
        Array.from({ length: size }, (_, index) => `e2e-visual-wish-${index}`),
      ),
    );
    const counts = wishTones.map(
      (tone) => tones.filter((value) => value === tone).length,
    );
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  }
});

it("keeps colours stable across reloads and sorting without repeating three-column stripes", () => {
  const ids = Array.from(
    { length: 12 },
    (_, index) => `e2e-visual-wish-${index}`,
  );
  const tones = createWishTones(ids);
  expect(createWishTones([...ids].reverse())).toEqual(tones);
  expect(createWishTones(ids)).toEqual(tones);
  expect(
    ids.slice(3).every((id, index) => tones[id] === tones[ids[index]]),
  ).toBe(false);
});
