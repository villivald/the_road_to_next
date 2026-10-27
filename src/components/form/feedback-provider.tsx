"use client";

import { CircleCheck, X } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import shell from "@/components/shell.module.css";
import { usePathname } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import styles from "./feedback.module.css";

const FeedbackContext = createContext<
  (message: string, trigger?: HTMLElement | null) => void
>(() => undefined);

const subscribeVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};
const pageVisible = () => document.visibilityState !== "hidden";
const serverVisible = () => true;

const subscribeViewport = (listener: () => void) => {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", listener);
  viewport?.addEventListener("scroll", listener);
  window.addEventListener("resize", listener);
  return () => {
    viewport?.removeEventListener("resize", listener);
    viewport?.removeEventListener("scroll", listener);
    window.removeEventListener("resize", listener);
  };
};
const viewportSnapshot = () => {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const top = window.visualViewport?.offsetTop ?? 0;
  return `${height}:${top}:${Math.max(0, window.innerHeight - height - top)}`;
};
const serverViewport = () => "0:0:0";

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useText();
  const pathname = usePathname();
  const [message, setMessage] = useState<{
    id: number;
    text: string;
    pathname: string;
  } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const visible = useSyncExternalStore(
    subscribeVisibility,
    pageVisible,
    serverVisible,
  );
  const sequence = useRef(0);
  const viewport = useSyncExternalStore(
    subscribeViewport,
    viewportSnapshot,
    serverViewport,
  );
  const [height, top, keyboard] = viewport.split(":").map(Number);
  const toast = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const notify = useCallback(
    (value: string, trigger?: HTMLElement | null) => {
      returnFocus.current =
        trigger ??
        (document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : null);
      sequence.current += 1;
      setPlacement("bottom");
      setMessage({ id: sequence.current, text: value, pathname });
    },
    [pathname],
  );
  useEffect(() => {
    const clear = () => {
      setMessage(null);
      setHovered(false);
      setFocused(false);
    };
    document.addEventListener("submit", clear);
    return () => document.removeEventListener("submit", clear);
  }, []);
  if (message && message.pathname !== pathname) {
    setMessage(null);
    setHovered(false);
    setFocused(false);
  }
  useEffect(() => {
    if (!message || hovered || focused || !visible) return;
    const timer = setTimeout(
      () =>
        setMessage((current) => (current?.id === message.id ? null : current)),
      8000,
    );
    return () => clearTimeout(timer);
  }, [message, hovered, focused, visible]);

  useEffect(() => {
    if (!message) return;
    let frame = 0;
    const avoidFocusedControl = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        const element = toast.current;
        if (
          !element ||
          !(active instanceof HTMLElement) ||
          active === document.body ||
          active === document.getElementById("main-content") ||
          element.contains(active)
        )
          return;
        const target = active.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        if (
          target.right > bounds.left &&
          target.left < bounds.right &&
          target.bottom > bounds.top &&
          target.top < bounds.bottom
        )
          setPlacement((current) => (current === "bottom" ? "top" : "bottom"));
      });
    };
    avoidFocusedControl();
    document.addEventListener("focusin", avoidFocusedControl);
    document.addEventListener("scroll", avoidFocusedControl, true);
    const unsubscribe = subscribeViewport(avoidFocusedControl);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", avoidFocusedControl);
      document.removeEventListener("scroll", avoidFocusedControl, true);
      unsubscribe();
    };
  }, [message]);

  const dismiss = () => {
    if (toast.current?.contains(document.activeElement)) {
      const target = returnFocus.current?.isConnected
        ? returnFocus.current
        : document.getElementById("main-content");
      target?.focus({ preventScroll: true });
    }
    setMessage(null);
    setHovered(false);
    setFocused(false);
  };
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <span
        className={shell["visually-hidden"]}
        aria-live="polite"
        aria-atomic="true"
      >
        {message && <span key={message.id}>{message.text}</span>}
      </span>
      {message && (
        <div
          ref={toast}
          role="status"
          aria-live="off"
          className={styles.toast}
          data-placement={placement}
          style={
            {
              "--toast-viewport-height": height ? `${height}px` : undefined,
              "--toast-keyboard-inset": `${keyboard}px`,
              "--toast-viewport-top": `${top}px`,
            } as CSSProperties
          }
          aria-label={t("Save confirmation")}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget) &&
              event.relatedTarget instanceof HTMLElement &&
              event.relatedTarget !== document.body
            )
              returnFocus.current = event.relatedTarget;
            setFocused(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            dismiss();
          }}
        >
          <CircleCheck aria-hidden="true" />
          <p>{message.text}</p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={dismiss}
            aria-label={t("Dismiss confirmation")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export const useSaveConfirmation = () => useContext(FeedbackContext);
