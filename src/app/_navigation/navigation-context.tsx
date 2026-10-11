"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { usePathname } from "@/i18n/navigation";
import type { DetailSection } from "./navigation-path";

const NavigationContext = createContext<{
  current: { pathname: string; section: DetailSection } | null;
  setSection: (pathname: string, section: DetailSection) => void;
}>({ current: null, setSection: () => undefined });

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{
    pathname: string;
    section: DetailSection;
  } | null>(null);
  const setSection = useCallback((pathname: string, section: DetailSection) => {
    setCurrent((previous) =>
      previous?.pathname === pathname && previous.section === section
        ? previous
        : { pathname, section },
    );
  }, []);
  return (
    <NavigationContext.Provider value={{ current, setSection }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function DetailNavigation({ section }: { section: DetailSection }) {
  const pathname = usePathname();
  const { setSection } = useContext(NavigationContext);
  useLayoutEffect(() => {
    setSection(pathname, section);
  }, [pathname, section, setSection]);
  return null;
}

export function useDetailSection() {
  const pathname = usePathname();
  const { current } = useContext(NavigationContext);
  return current?.pathname === pathname ? current.section : null;
}
