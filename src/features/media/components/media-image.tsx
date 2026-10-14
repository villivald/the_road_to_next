import Image from "next/image";
import type { MediaImage as ImageDetails } from "../types";
import { DETAIL_IMAGE_SIZES } from "../variants";
import styles from "./media.module.css";

export function MediaImage({
  image,
  compact = false,
  guestListId,
  sizes = DETAIL_IMAGE_SIZES,
}: {
  image: ImageDetails | null;
  compact?: boolean;
  guestListId?: string;
  sizes?: string;
}) {
  if (!image) {
    return null;
  }

  const src = guestListId
    ? `/guest/lists/${encodeURIComponent(guestListId)}/media/${image.id}`
    : `/api/media/${image.id}`;
  const widths = image.variantWidths ?? [];
  const srcSet = widths.length
    ? [
        ...widths.map((width) => `${src}?w=${width} ${width}w`),
        `${src} ${image.width}w`,
      ].join(", ")
    : undefined;

  return (
    <picture className={styles.picture}>
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <Image
        className={compact ? styles.thumbnail : styles.image}
        src={src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        unoptimized
      />
    </picture>
  );
}
