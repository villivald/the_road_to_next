"use client";
import { LucideMoon, LucideSun } from "lucide-react";
import { useTheme } from "next-themes";
import { useText } from "@/i18n/use-text";
import styles from "../shell.module.css";

export default function ThemeSwitcher() {
  const t = useText();

  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles["theme-toggle"]}
      aria-label={t("Toggle theme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <LucideSun size={18} aria-hidden="true" />
      ) : (
        <LucideMoon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
