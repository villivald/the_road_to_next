"use client";

import Image from "next/image";
import { useId, useState } from "react";
import birthdayEn from "@/assets/illustrations/premium-sharing-card.png";
import birthdayFi from "@/assets/illustrations/premium-sharing-card-fi.png";
import botanicalEn from "@/assets/illustrations/sharing-card-botanical-en.png";
import botanicalFi from "@/assets/illustrations/sharing-card-botanical-fi.png";
import festiveEn from "@/assets/illustrations/sharing-card-festive-en.png";
import festiveFi from "@/assets/illustrations/sharing-card-festive-fi.png";
import { useText } from "@/i18n/use-text";
import styles from "./personalization.module.css";

const examples = [
  { id: "birthday", name: "Birthday", en: birthdayEn, fi: birthdayFi },
  { id: "festive", name: "Christmas", en: festiveEn, fi: festiveFi },
  { id: "botanical", name: "Botanical", en: botanicalEn, fi: botanicalFi },
] as const;

export function SharingCardPreview() {
  const t = useText();
  const id = useId();
  const [selected, setSelected] = useState("birthday");
  const example = examples.find((item) => item.id === selected) ?? examples[0];

  return (
    <fieldset
      className={styles["card-examples"]}
      aria-describedby={`${id}-help`}
    >
      <legend>{t("Example sharing card")}</legend>
      <div className={styles["example-themes"]}>
        {examples.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name={`${id}-theme`}
              value={item.id}
              checked={item.id === selected}
              onChange={() => setSelected(item.id)}
            />
            {t(item.name)}
          </label>
        ))}
      </div>
      <Image
        className={styles["example-card"]}
        src={t.locale === "fi" ? example.fi : example.en}
        alt={t("Example sharing card in the {theme} theme", {
          theme: t(example.name),
        })}
        sizes="(max-width: 640px) 90vw, 600px"
      />
      <p id={`${id}-help`} className={styles.help}>
        {t(
          "These examples do not change your list. The QR code opens the Premium page.",
        )}
      </p>
    </fieldset>
  );
}
