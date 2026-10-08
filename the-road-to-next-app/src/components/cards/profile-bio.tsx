"use client";

import { useId, useState } from "react";
import styles from "./cards.module.css";

export function ProfileBio({ text, name }: { text: string; name: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const characters = Array.from(text);
  const long = characters.length > 180;

  return (
    <div>
      <p id={id} className={styles.bio}>
        {long && !expanded
          ? `${characters.slice(0, 180).join("").trimEnd()}…`
          : text}
      </p>
      {long && (
        <button
          type="button"
          className={styles["bio-toggle"]}
          aria-controls={id}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Show less" : "Read more"} about ${name}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
