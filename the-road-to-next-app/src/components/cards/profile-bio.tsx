"use client";
import { useId, useState } from "react";
import { useText } from "@/i18n/use-text";
import styles from "./cards.module.css";

export function ProfileBio({ text, name }: { text: string; name: string }) {
  const t = useText();

  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const characters = Array.from(text);
  const long = characters.length > 180;

  return (
    <div>
      <p id={id} className={styles.bio}>
        {long && !expanded
          ? t("{value0}…", {
              value0: characters.slice(0, 180).join("").trimEnd(),
            })
          : text}
      </p>
      {long && (
        <button
          type="button"
          className={styles["bio-toggle"]}
          aria-controls={id}
          aria-expanded={expanded}
          aria-label={t("{value0} about {value1}", {
            value0: expanded ? t("Show less") : t("Read more"),
            value1: name,
          })}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("Show less") : t("Read more")}
        </button>
      )}
    </div>
  );
}
