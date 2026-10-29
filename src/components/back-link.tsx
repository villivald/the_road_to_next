import { ArrowLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./shell.module.css";

export function BackLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={`${styles["back-link"]} ${className ?? ""}`}>
      <ArrowLeft size={18} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
