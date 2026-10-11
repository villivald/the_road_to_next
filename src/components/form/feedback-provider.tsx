"use client";

import { CircleCheck, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import shell from "@/components/shell.module.css";
import { usePathname } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import styles from "./feedback.module.css";

const FeedbackContext = createContext<(message: string) => void>(
  () => undefined,
);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useText();
  const pathname = usePathname();
  const [message, setMessage] = useState<{
    text: string;
    pathname: string;
  } | null>(null);
  const [paused, setPaused] = useState(false);
  const notify = useCallback(
    (value: string) => {
      setPaused(false);
      setMessage({ text: value, pathname });
    },
    [pathname],
  );
  if (message && message.pathname !== pathname) setMessage(null);
  useEffect(() => {
    if (!message || paused) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message, paused]);
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <span
        className={shell["visually-hidden"]}
        aria-live="polite"
        aria-atomic="true"
      >
        {message?.text}
      </span>
      {message && (
        <aside
          className={styles.toast}
          aria-label={t("Save confirmation")}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <CircleCheck aria-hidden="true" />
          <p>{message.text}</p>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setPaused(false);
            }}
            aria-label={t("Dismiss confirmation")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      )}
    </FeedbackContext.Provider>
  );
}

export const useSaveConfirmation = () => useContext(FeedbackContext);
