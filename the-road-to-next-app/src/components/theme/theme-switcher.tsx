"use client";
import { LucideMoon, LucideSun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useText } from "@/i18n/use-text";
import styles from "../shell.module.css";

const subscribe = () => () => {};

export default function ThemeSwitcher() {
  const t = useText();

  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dark = hydrated && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={styles["theme-toggle"]}
      aria-label={t("Toggle theme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {dark ? (
        <LucideSun size={18} aria-hidden="true" />
      ) : (
        <LucideMoon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
