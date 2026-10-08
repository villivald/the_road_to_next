import { Gift, Layers, UserRound } from "lucide-react";
import { MediaImage } from "@/features/media/components/media-image";
import type { MediaImage as ImageDetails } from "@/features/media/types";
import styles from "./cards.module.css";

export function CardMedia({
  image,
  kind = "wish",
  guestListId,
}: {
  image: ImageDetails | null;
  kind?: "wish" | "list";
  guestListId?: string;
}) {
  return (
    <div className={styles.media}>
      {image ? (
        <MediaImage image={image} compact guestListId={guestListId} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          {kind === "wish" ? <Gift /> : <Layers />}
          <span>
            {kind === "wish" ? "A little wish" : "A collection of wishes"}
          </span>
        </div>
      )}
    </div>
  );
}

export function ListPreview({
  image,
  images,
}: {
  image: ImageDetails | null;
  images: ImageDetails[];
}) {
  if (image || !images.length) return <CardMedia image={image} kind="list" />;

  return (
    <div className={styles.stack} aria-label="Preview of available wishes">
      {images.map((preview) => (
        <div key={preview.id} className={styles["stack-image"]}>
          <MediaImage image={preview} compact />
        </div>
      ))}
    </div>
  );
}

export function UserAvatar({ image }: { image: ImageDetails | null }) {
  return (
    <div className={styles.avatar}>
      {image ? (
        <MediaImage image={image} compact />
      ) : (
        <UserRound aria-hidden="true" />
      )}
    </div>
  );
}
