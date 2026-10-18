"use client";

import { Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import styles from "@/components/shell.module.css";
import { usePathname } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { NavLink } from "./nav-link";

export type NavigationItem = {
  href: string;
  match?: string;
  label: string;
  icon?: ReactNode;
  shortcutLabel?: string;
};

export function MainNavigation({
  items,
  collapsible,
}: {
  items: NavigationItem[];
  collapsible: boolean;
}) {
  const pathname = usePathname();
  const t = useText();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const shortcuts = useRef<HTMLElement>(null);
  const [labelsFit, setLabelsFit] = useState(false);

  useEffect(() => {
    const navigation = shortcuts.current;
    if (!navigation) return;
    const labels = navigation.querySelectorAll<HTMLElement>(
      "[data-shortcut-label]",
    );
    const measure = () => {
      setLabelsFit(
        Array.from(labels).every((label) => {
          const link = label.closest("a")!;
          const style = getComputedStyle(link);
          const available =
            link.clientWidth -
            parseFloat(style.paddingInlineStart) -
            parseFloat(style.paddingInlineEnd);
          return Math.ceil(label.getBoundingClientRect().width) <= available;
        }),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    labels.forEach((label) => observer.observe(label));
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [items]);
  const [menu, setMenu] = useState({ pathname, open: false });
  if (menu.pathname !== pathname) setMenu({ pathname, open: false });
  const open = menu.pathname === pathname && menu.open;
  const secondaryActive = items.some((item) => {
    const match = item.match ?? item.href;
    return (
      !item.shortcutLabel &&
      (pathname === match || pathname.startsWith(`${match}/`))
    );
  });

  return (
    <div
      className={
        collapsible ? styles["navigation-menu"] : styles["navigation-wrapper"]
      }
      data-open={open}
      data-labels-fit={labelsFit}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest('a[aria-current="page"]') &&
          open
        ) {
          setMenu({ pathname, open: false });
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setMenu({ pathname, open: false });
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setMenu({ pathname, open: false });
          button.current?.focus();
        }
      }}
    >
      {collapsible && (
        <>
          <nav
            ref={shortcuts}
            className={styles["quick-navigation"]}
            aria-label={t("Quick navigation")}
          >
            {items
              .filter((item) => item.shortcutLabel)
              .map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  match={item.match}
                  icon={item.icon}
                  shortcutLabel={item.shortcutLabel}
                  shortcutLabelVisible={labelsFit}
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <button
            ref={button}
            type="button"
            className={styles["navigation-toggle"]}
            data-current={secondaryActive || undefined}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setMenu({ pathname, open: !open })}
          >
            {open ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
            <span>{t("Menu")}</span>
          </button>
        </>
      )}
      <nav
        id={id}
        aria-label={t("Main navigation")}
        className={`${styles.navigation} ${collapsible ? styles["member-navigation"] : ""}`}
      >
        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            match={item.match}
            icon={item.icon}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
