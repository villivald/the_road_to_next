import {
  LucideCircleUser,
  LucideLibrary,
  LucideTicket,
  LucideUsers,
} from "lucide-react";
import {
  accountProfilePath,
  homePath,
  organizationsPath,
  ticketsPath,
} from "@/paths";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    title: "All Tickets",
    href: homePath,
    icon: <LucideLibrary />,
  },
  {
    title: "My Tickets",
    href: ticketsPath,
    icon: <LucideTicket />,
  },
  {
    separator: true,
    title: "Account",
    href: accountProfilePath,
    icon: <LucideCircleUser />,
  },

  {
    title: "Organizations",
    href: organizationsPath,
    icon: <LucideUsers />,
  },
];

export const closedClassName =
  "text-background opacity-0 transition-all duration-300 group-hover:z-40 group-hover:ml-4 group-hover:rounded group-hover:bg-foreground group-hover:p-2 group-hover:opacity-100";
