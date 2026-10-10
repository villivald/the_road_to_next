import Image from "next/image";
import type { MediaImage as ImageDetails } from "../types";
import styles from "./media.module.css";

export function MediaImage({
  image,
  compact = false,
  guestListId,
}: {
  image: ImageDetails | null;
  compact?: boolean;
  guestListId?: string;
}) {
  if (!image) {
    return null;
  }

  return (
    <Image
      className={compact ? styles.thumbnail : styles.image}
      src={
        guestListId
          ? `/guest/lists/${encodeURIComponent(guestListId)}/media/${image.id}`
          : `/api/media/${image.id}`
      }
      alt={image.alt}
      width={image.width}
      height={image.height}
      unoptimized
    />
  );
}
