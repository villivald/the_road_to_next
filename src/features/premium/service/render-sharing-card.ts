import { readFile } from "node:fs/promises";
import path from "node:path";
import opentype, { type Font } from "opentype.js";
import QRCode from "qrcode";
import sharp from "sharp";
import { localizedPath } from "@/i18n/config";
import { createText } from "@/i18n/text";
import { getBaseUrl } from "@/utils/url";
import { listThemes, resolveListTheme } from "../themes";

const fonts = Promise.all(
  ["Fraunces", "Manrope"].map(async (name) => {
    const buffer = await readFile(
      path.join(process.cwd(), `src/assets/fonts/${name}-Variable.ttf`),
    );
    const font = opentype.parse(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
    );
    // The library supports variable fonts; its community types still target v1.
    (
      font as Font & {
        variation: { set: (axes: Record<string, number>) => void };
      }
    ).variation.set(
      name === "Fraunces" ? { wght: 500, opsz: 32 } : { wght: 450 },
    );
    return font;
  }),
);

// Turn user text into local font outlines; no markup or remote font requests.
const textPaths = (
  font: Font,
  text: string,
  size: number,
  width: number,
  x: number,
  y: number,
  maxLines = 4,
) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.getAdvanceWidth(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const { segment } of new Intl.Segmenter("und", {
      granularity: "grapheme",
    }).segment(word)) {
      if (line && font.getAdvanceWidth(line + segment, size) > width) {
        lines.push(line);
        line = "";
      }
      line += segment;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines.at(-1) ?? "";
    while (font.getAdvanceWidth(last + "…", size) > width)
      last = Array.from(last).slice(0, -1).join("");
    lines[lines.length - 1] = `${last}…`;
  }
  return lines
    .map(
      (value, index) =>
        `<path transform="translate(${x} ${y + index * size * 1.3})" d="${font.getPath(value, 0, 0, size).toPathData(2)}"/>`,
    )
    .join("");
};

export const sharingCardUrl = (id: string, locale: string) =>
  new URL(
    localizedPath(`/lists/${encodeURIComponent(id)}`, locale),
    getBaseUrl(),
  ).href;

export async function renderSharingCard(
  list: { id: string; title: string; theme: string; visibility: string },
  locale: string,
  showcase = false,
) {
  const t = createText(locale);
  const theme = resolveListTheme(list.theme);
  const palette = listThemes[theme];
  const link = showcase
    ? new URL("/premium", getBaseUrl()).href
    : sharingCardUrl(list.id, locale);
  const qr = await QRCode.toBuffer(link, {
    width: 280,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: palette.ink, light: "#ffffff" },
  });
  const graphemes = [
    ...new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(
      list.title,
    ),
  ].map((s) => s.segment);
  const title =
    graphemes.length > 120
      ? `${graphemes.slice(0, 119).join("")}…`
      : list.title;
  const caption =
    list.visibility === "PRIVATE"
      ? t("A private wishlist")
      : t("A few things I love");
  const [headingFont, bodyFont] = await fonts;
  const textLeft = 320;
  const textWidth = 500;
  const widestWord = Math.max(
    1,
    ...title.split(/\s+/u).map((word) => headingFont.getAdvanceWidth(word, 54)),
  );
  const titleSize = Math.max(
    34,
    Math.min(54, (54 * textWidth * 0.96) / widestWord),
  );
  const heading = textPaths(
    headingFont,
    title,
    titleSize,
    textWidth,
    textLeft,
    310,
  );
  const subtitle = textPaths(
    bodyFont,
    caption,
    22,
    textWidth,
    textLeft,
    205,
    2,
  );
  const brand = textPaths(bodyFont, "Wishlist", 32, 400, textLeft, 115, 1);
  const note = textPaths(
    bodyFont,
    list.visibility === "PRIVATE"
      ? t("Sign in with list access to open.")
      : t("Scan to open the wishlist."),
    18,
    300,
    830,
    620,
    3,
  );
  const host = textPaths(
    bodyFont,
    new URL(link).host,
    20,
    textWidth,
    textLeft,
    680,
    2,
  );
  const artwork = await sharp(
    await readFile(
      path.join(
        process.cwd(),
        `public/illustrations/themes/${palette.artwork ?? listThemes.botanical.artwork}`,
      ),
    ),
  )
    .resize(245, 734)
    .png()
    .toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${palette.paper}"/><rect x="32" y="32" width="1136" height="736" rx="18" fill="none" stroke="${palette.accent}" stroke-width="2"/><path d="M${textLeft} 610H790" stroke="${palette.accent}"/><rect x="842" y="280" width="296" height="296" rx="12" fill="white"/><g fill="${palette.ink}">${brand}${subtitle}${heading}${note}${host}</g></svg>`;
  return sharp(Buffer.from(svg))
    .composite([
      { input: artwork, left: 33, top: 33 },
      { input: qr, left: 850, top: 288 },
    ])
    .png()
    .toBuffer();
}
