export const IMAGE_VARIANT_VERSION = 1;
export const IMAGE_VARIANT_WIDTHS = [200, 400, 800, 1200] as const;
export const AVATAR_VARIANT_WIDTHS = [64, 128, 256] as const;

const supportedWidths: readonly number[] = [
  ...IMAGE_VARIANT_WIDTHS,
  ...AVATAR_VARIANT_WIDTHS,
];

export const requestedImageWidth = (request: Request) => {
  const values = new URL(request.url).searchParams.getAll("w");
  if (!values.length) return null;
  if (values.length !== 1 || !/^\d+$/.test(values[0])) return undefined;
  const width = Number(values[0]);
  return supportedWidths.includes(width) ? width : undefined;
};

export const imageVariantPath = (pathname: string, width: number) => {
  if (!supportedWidths.includes(width) || !pathname.endsWith(".webp")) {
    throw new Error("Invalid image variant");
  }
  return `${pathname.slice(0, -5)}-${width}.webp`;
};

export const imageStoragePaths = (media: {
  pathname: string;
  variantWidths: number[];
}) => [
  media.pathname,
  ...media.variantWidths.map((width) =>
    imageVariantPath(media.pathname, width),
  ),
];

// Match the shell, unpadded auto-fill cards, 1.75rem gaps, and stack image borders.
const pageWidth = "min(100vw, 1200px) - 2 * clamp(1rem, 4vw, 2.5rem)";
const cardWidths = [
  { condition: "(min-width: 974px)", width: `(${pageWidth} - 3.5rem) / 3` },
  { condition: "(min-width: 640px)", width: `(${pageWidth} - 1.75rem) / 2` },
  { condition: "", width: pageWidth },
];
export const CARD_IMAGE_SIZES = cardWidths
  .map(({ condition, width }) => `${condition} calc(${width})`.trim())
  .join(", ");
export const STACK_IMAGE_SIZES = cardWidths
  .map(({ condition, width }) =>
    `${condition} calc(((${width}) - 3rem) * 0.62 - 14px)`.trim(),
  )
  .join(", ");
export const DETAIL_IMAGE_SIZES =
  "(max-width: 700px) calc(100vw - 2rem), 640px";
