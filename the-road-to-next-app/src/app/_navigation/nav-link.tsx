"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
