import { LucideKanban } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { homePath, ticketsPath } from "@/paths";
import ThemeSwitcher from "./theme/theme-switcher";

const Header = () => {
  return (
    <nav className="fixed top-0 right-0 left-0 z-20 flex w-full justify-between border-b bg-background/95 px-5 py-2.5 backdrop-blur supports-backdrop-blur:bg-background/60">
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
        <Link
          href={ticketsPath}
          className={buttonVariants({
            variant: "default",
          })}
        >
          Tickets
        </Link>
      </div>
    </nav>
  );
};

export default Header;
