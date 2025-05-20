"use client";

import { LucideKanban } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { homePath, signInPath, signUpPath } from "@/paths";
import { AccountDropdown } from "./account-dropdown";
import ThemeSwitcher from "./theme/theme-switcher";

const Header = () => {
  const { user, isFetched } = useAuth();

  if (!isFetched) {
    return null;
  }

  const navItems = user ? (
    <AccountDropdown user={user} />
  ) : (
    <>
      <Link
        href={signUpPath}
        className={buttonVariants({
          variant: "outline",
        })}
      >
        Sign Up
      </Link>
      <Link
        href={signInPath}
        className={buttonVariants({
          variant: "default",
        })}
      >
        Sign In
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 right-0 left-0 z-20 flex w-full animate-header-from-top justify-between border-b bg-background/95 px-5 py-2.5 backdrop-blur supports-backdrop-blur:bg-background/60">
      <div className="align-items flex gap-x-2">
        <Button asChild variant="ghost">
          <Link href={homePath}>
            <LucideKanban />
            <h1 className="text-lg font-semibold">TicketBounty</h1>
          </Link>
        </Button>
      </div>
      <div className="align-items flex gap-x-2">
        <ThemeSwitcher />
        {navItems}
      </div>
    </nav>
  );
};

export default Header;
