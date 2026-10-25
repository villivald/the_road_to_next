import jsQR from "jsqr";
import sharp from "sharp";
import { afterEach, expect, it, vi } from "vitest";
import {
  renderSharingCard,
  sharingCardUrl,
} from "@/features/premium/service/render-sharing-card";
import { listThemeIds, resolveListTheme } from "@/features/premium/themes";

afterEach(() => vi.unstubAllEnvs());
it.each(listThemeIds)(
  "exports a scannable, local PNG for %s",
  async (theme) => {
    vi.stubEnv("APP_URL", "https://wishlist.fi");
    const image = await renderSharingCard(
      {
        id: "a-list",
        title: "Syntymäpäivä & toiveet <3",
        theme,
        visibility: "PUBLIC",
      },
      "fi",
    );
    const { data, info } = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([1200, 800]);
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    expect(decoded?.data).toBe("https://wishlist.fi/fi/lists/a-list");
  },
);
it("renders the complete caption below the QR code", async () => {
  const image = await renderSharingCard(
    {
      id: "example",
      title: "Birthday wishes",
      theme: "botanical",
      visibility: "PUBLIC",
    },
    "en",
  );
  const caption = await sharp(image)
    .extract({ left: 1008, top: 604, width: 40, height: 26 })
    .toBuffer();
  const stats = await sharp(caption).stats();
  expect(stats.channels[0].min).toBeLessThan(100);
});
it("keeps a Finnish compound title on one line instead of orphaning its final letters", async () => {
  const image = await renderSharingCard(
    {
      id: "example",
      title: "Syntymäpäivätoiveet",
      theme: "birthday",
      visibility: "PUBLIC",
    },
    "fi",
  );
  const belowTitle = await sharp(image)
    .extract({ left: 320, top: 330, width: 500, height: 70 })
    .toBuffer();
  const stats = await sharp(belowTitle).stats();
  expect(stats.channels[0].min).toBeGreaterThan(200);
});
it("handles long untrusted text without making external requests or breaking the QR code", async () => {
  vi.stubEnv("APP_URL", "https://wishlist.fi");
  const fetcher = vi.spyOn(globalThis, "fetch");
  try {
    const image = await renderSharingCard(
      {
        id: "private-list",
        title: '<image href="https://evil.example/secret"/> Ä Ö 🥳 '.repeat(8),
        theme: "botanical",
        visibility: "PRIVATE",
      },
      "fi",
    );
    const { data, info } = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(
      jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
    ).toBe("https://wishlist.fi/fi/lists/private-list");
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});
it("never embeds configured credentials or query strings in sharing URLs", () => {
  vi.stubEnv("APP_URL", "https://wishlist.fi/?guest=secret");
  expect(sharingCardUrl("private-list", "en")).toBe(
    "https://wishlist.fi/en/lists/private-list",
  );
  expect(resolveListTheme("untrusted-class")).toBe("classic");
});
