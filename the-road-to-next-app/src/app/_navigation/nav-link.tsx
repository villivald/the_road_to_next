"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";

export function NavLink({
  href,
  match = href,
  children,
}: {
  href: string;
  match?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === match || pathname.startsWith(`${match}/`);

  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
