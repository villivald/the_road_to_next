import { Gift, Layers, UserRound } from "lucide-react";
import { MediaImage } from "@/features/media/components/media-image";
import type { MediaImage as ImageDetails } from "@/features/media/types";
import { useText } from "@/i18n/use-text";
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
  const t = useText();

  return (
    <div className={styles.media}>
      {image ? (
        <MediaImage image={image} compact guestListId={guestListId} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          {kind === "wish" ? <Gift /> : <Layers />}
          <span>
            {kind === "wish" ? t("A little wish") : t("A collection of wishes")}
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
  const t = useText();

  if (image || !images.length) return <CardMedia image={image} kind="list" />;

  return (
    <div className={styles.stack} aria-label={t("Preview of available wishes")}>
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
