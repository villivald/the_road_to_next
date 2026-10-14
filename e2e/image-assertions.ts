import { expect, type Locator } from "@playwright/test";

// Width-descriptor sources report density-corrected naturalWidth, not file width.
export const expectImageLoaded = async (image: Locator) => {
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) =>
        element.complete ? element.naturalWidth : 0,
      ),
    )
    .toBeGreaterThan(0);
};
