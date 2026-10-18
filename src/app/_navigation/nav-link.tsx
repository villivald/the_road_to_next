"use client";

import { useLinkStatus } from "next/link";
import { type ReactNode, useId } from "react";
import shell from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import styles from "./nav-link.module.css";
import { useDetailSection } from "./navigation-context";

function NavigationProgress() {
  const { pending } = useLinkStatus();
  const t = useText();
  return (
    <>
      <span
        aria-hidden="true"
        className={styles.progress}
        data-navigation-pending={pending || undefined}
      />
      <span
        aria-live="polite"
        aria-atomic="true"
        className={shell["visually-hidden"]}
      >
        {pending ? t("Loading") : null}
      </span>
    </>
  );
}

export function NavLink({
  href,
  match = href,
  children,
  icon,
  shortcutLabel,
  shortcutLabelVisible = true,
}: {
  href: string;
  match?: string;
  children: ReactNode;
  icon?: ReactNode;
  shortcutLabel?: string;
  shortcutLabelVisible?: boolean;
}) {
  const pathname = usePathname();
  const labelId = useId();
  const section = useDetailSection();
  const detail =
    /^\/lists\/[^/]+(?:\/wishes\/[^/]+)?$/.test(pathname) &&
    pathname !== "/lists/shared" &&
    !pathname.endsWith("/new");
  const active = detail
    ? match === `/${section}`
    : pathname === match || pathname.startsWith(`${match}/`);

  return (
    <Link
      href={href}
      className={styles.link}
      aria-labelledby={labelId}
      aria-current={active ? "page" : undefined}
      title={
        shortcutLabel && typeof children === "string" ? children : undefined
      }
    >
      {icon}
      <span
        id={labelId}
        className={shortcutLabel ? shell["visually-hidden"] : styles.label}
      >
        {children}
      </span>
      {shortcutLabel && (
        <span
          data-shortcut-label
          data-visible={shortcutLabelVisible}
          aria-hidden="true"
          className={styles["shortcut-caption"]}
        >
          {shortcutLabel}
        </span>
      )}
      <NavigationProgress />
    </Link>
  );
}
