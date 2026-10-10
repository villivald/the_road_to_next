import { CircleCheck, CircleMinus } from "lucide-react";
import { useText } from "@/i18n/use-text";
import styles from "./cards.module.css";

export function ReservationAvailability({ enabled }: { enabled: boolean }) {
  const t = useText();
  const Icon = enabled ? CircleCheck : CircleMinus;

  return (
    <p
      className={`${styles.state} ${styles["reservation-status"]}`}
      data-enabled={enabled}
    >
      <Icon size={16} aria-hidden="true" />
      {enabled ? t("Reservations enabled") : t("Reservations off")}
    </p>
  );
}
