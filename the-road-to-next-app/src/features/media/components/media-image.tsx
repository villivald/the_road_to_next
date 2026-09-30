import Image from "next/image";
import type { MediaImage as ImageDetails } from "../types";
import styles from "./media.module.css";

export function MediaImage({
  image,
  compact = false,
}: {
  image: ImageDetails | null;
  compact?: boolean;
}) {
  if (!image) {
    return null;
  }

  return (
    <Image
      className={compact ? styles.thumbnail : styles.image}
      src={`/api/media/${image.id}`}
      alt={image.alt}
      width={image.width}
      height={image.height}
      unoptimized
    />
  );
}
